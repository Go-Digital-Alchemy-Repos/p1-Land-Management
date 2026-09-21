import React from "react";
import { createRoot } from "react-dom/client";
import {
  PipelineProvider,
  PipelineSettingsEditor,
} from "../src/PipelineSettings";
import { SalesPipelineBoard } from "../src/SalesPipelineBoard";
import { defaultPipelineConfig } from "@workspace/api-zod/pipeline-settings";
import "../src/theme.css";
import "../src/style.css";
if (!["localhost", "127.0.0.1"].includes(location.hostname))
  throw Error("Local fixture only");

const originalStages = structuredClone(defaultPipelineConfig.stages);
const customStages = [
  { ...originalStages[4], label: "Closed won", color: "emerald" },
  { ...originalStages[0], label: "Incoming", color: "blue" },
  { ...originalStages[1], label: "Reached", color: "cyan" },
  { ...originalStages[2], label: "Qualified", color: "green" },
  { ...originalStages[3], label: "Proposal", color: "amber" },
  { ...originalStages[5], label: "Closed lost", color: "slate" },
] as typeof defaultPipelineConfig.stages;

let saved = {
  revision: 0,
  config: { version: 1 as const, stages: customStages },
};
const inquiries = {
  new: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Synthetic North Site",
      reported_company_name: "Fixture Landscape Co.",
      location: "Union County",
      status: "new",
      owner_id: null,
      owner_name: null,
      next_action: "Call prospect",
      next_action_due_at: null,
    },
  ],
  contacted: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Synthetic South Site",
      reported_company_name: "Fixture Land Co.",
      location: "York County",
      status: "contacted",
      owner_id: "fixture-owner",
      owner_name: "Fixture Manager",
      next_action: "Confirm walk-through",
      next_action_due_at: "2026-09-21T16:00:00.000Z",
    },
  ],
  qualified: [],
  proposal: [],
  won: [],
  lost: [],
} as const;

window.fetch = async (input, init) => {
  const rawUrl = input instanceof Request ? input.url : String(input);
  const url = new URL(rawUrl, location.origin);
  if (url.pathname === "/api/v1/sales/pipeline-settings") {
    if (init?.method === "PUT") {
      const body = JSON.parse(String(init.body));
      if (body.expectedRevision !== saved.revision)
        return new Response(JSON.stringify({ error: "Conflict" }), {
          status: 409,
        });
      saved = { revision: saved.revision + 1, config: body.config };
    }
    return new Response(JSON.stringify(saved), {
      headers: { "content-type": "application/json" },
    });
  }
  if (url.pathname === "/api/v1/sales/inquiries") {
    const status = url.searchParams.get("status") as keyof typeof inquiries;
    return new Response(
      JSON.stringify({ items: inquiries[status] || [], nextCursor: null }),
      { headers: { "content-type": "application/json" } },
    );
  }
  throw Error(`Unexpected local fixture request: ${url.pathname}`);
};

function SalesFixture() {
  return (
    <main style={{ padding: 24, maxWidth: 1600, margin: "auto" }}>
      <h1>Sales workspace fixture</h1>
      <p>
        Isolated in-memory acceptance fixture; no provider or production writes.
      </p>
      <nav
        className="workspace-tabs sales-workspace-tabs"
        aria-label="Sales workspace"
      >
        <a href="/sales">Overview</a>
        <a href="/sales/pipeline" aria-current="page" className="active">
          Pipeline
        </a>
      </nav>
      <PipelineProvider>
        <PipelineSettingsEditor />
        <SalesPipelineBoard
          canOnboard
          onCreate={() => {
            document.getElementById("fixture-status")!.textContent =
              "Create inquiry is represented only; no record was created.";
          }}
        />
      </PipelineProvider>
      <p id="fixture-status" role="status" />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SalesFixture />);
