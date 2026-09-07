import { useState } from "react";
import { createRoot } from "react-dom/client";
import { WorkReadiness, type ReadinessUpdate } from "../src/WorkReadiness";
import "../src/style.css";
let conflict = true;
function Fixture() {
  const [work, setWork] = useState({
    id: "synthetic-work",
    version: 1,
    status: "scheduled",
    prerequisites: [{ label: "Equipment: Mower inspection", done: false }],
    override_reason: "Synthetic access override" as string | null,
  });
  const [saved, setSaved] = useState<ReadinessUpdate | null>(null);
  return (
    <div style={{ maxWidth: 650, margin: "2rem auto", padding: "1rem" }}>
      <WorkReadiness
        key={work.version}
        work={work}
        save={async (_id, input) => {
          if (conflict) {
            conflict = false;
            throw new Error("Work order changed; refresh and retry");
          }
          setSaved(input);
          setWork({
            ...work,
            version: work.version + 1,
            prerequisites: input.prerequisites,
            override_reason: null,
          });
        }}
        onChanged={async () => {}}
      />
      <p role="status">
        {saved ? "Saved readiness. Override cleared." : "No readiness saved."}
      </p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
