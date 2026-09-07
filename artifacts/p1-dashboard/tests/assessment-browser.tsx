import { createRoot } from "react-dom/client";
import { AssessmentAvailability } from "../src/AssessmentAvailability";
import "../src/style.css";
let config = {
  version: 1,
  duration_minutes: 60,
  buffer_before: 15,
  buffer_after: 15,
  windows: [{ day: 1, start: "09:00", end: "17:00" }],
};
const blackouts: any[] = [];
async function request(path: string, body?: any) {
  if (body === undefined)
    return { config, blackouts, timeZone: "America/New_York" };
  if (path.endsWith("/generate")) return { created: 8 };
  if (path.endsWith("/blackouts")) {
    blackouts.push({
      id: crypto.randomUUID(),
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      reason: body.reason,
    });
    return { ok: true };
  }
  if (path.endsWith("/archive")) {
    blackouts.splice(
      blackouts.findIndex((v) => path.includes(v.id)),
      1,
    );
    return { ok: true };
  }
  config = {
    version: config.version + 1,
    duration_minutes: body.durationMinutes,
    buffer_before: body.bufferBefore,
    buffer_after: body.bufferAfter,
    windows: body.windows,
  };
  return config;
}
createRoot(document.getElementById("root")!).render(
  <AssessmentAvailability request={request} onChange={async () => {}} />,
);
