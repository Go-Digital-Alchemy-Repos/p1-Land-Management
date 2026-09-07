import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ScheduleCalendar } from "../src/ScheduleCalendar";
import "../src/style.css";
function Fixture() {
  const [selected, setSelected] = useState("");
  return (
    <>
      <ScheduleCalendar
        staff={[{ id: "crew1", name: "North crew" }]}
        canManage={true}
        onSelect={setSelected}
        work={[
          {
            id: "a",
            title: "North meadow mowing",
            property_name: "Synthetic farm",
            scheduled_at: new Date().toISOString(),
            assigned_to: "crew1",
            status: "scheduled",
          },
          {
            id: "b",
            title: "Driveway assessment",
            property_name: "Synthetic estate",
            scheduled_at: new Date().toISOString(),
            assigned_to: null,
            status: "draft",
          },
          {
            id: "c",
            title: "Unscheduled clearing",
            property_name: "Synthetic woods",
            scheduled_at: null,
            status: "draft",
          },
          {
            id: "d",
            title: "Cancelled visit",
            property_name: "Synthetic farm",
            scheduled_at: new Date().toISOString(),
            status: "cancelled",
          },
        ]}
      />
      <p role="status">Selected work: {selected || "none"}</p>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
