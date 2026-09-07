import React from "react";
import { createRoot } from "react-dom/client";
import { ClientContacts } from "../src/ClientContacts";
import "../src/style.css";
let rows: any[] = [];
async function request(path: string, body?: any) {
  if (!body) return [...rows];
  const id = path.split("/")[4];
  if (id) {
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0 || rows[index].version !== body.version)
      throw new Error("Contact changed; refresh before saving");
    rows[index] = { ...rows[index], ...body, version: body.version + 1 };
    return rows[index];
  }
  const row = { ...body, id: crypto.randomUUID(), version: 1, archived: false };
  rows.push(row);
  return row;
}
createRoot(document.getElementById("root")!).render(
  <main style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
    <h1>Contact editor — synthetic browser fixture</h1>
    <ClientContacts
      client={{ id: "synthetic", name: "Synthetic Client" }}
      request={request}
    />
  </main>,
);
