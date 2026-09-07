import { useEffect, useState } from "react";
type Window = { day: number; start: string; end: string };
type Config = {
  version: number;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  windows: Window[];
};
export function AssessmentAvailability({
  request,
  onChange,
}: {
  request: (path: string, body?: unknown) => Promise<any>;
  onChange: () => Promise<void>;
}) {
  const [config, setConfig] = useState<Config | null>(null),
    [blackouts, setBlackouts] = useState<any[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  async function load() {
    const data = await request("/assessment-availability");
    setConfig(data.config);
    setBlackouts(data.blackouts);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel">
      <summary>Configure assessment availability</summary>
      <p>
        Weekly windows use America/New_York. Travel buffers fit inside each
        window. Saving rules withdraws unbooked generated appointments;
        confirmed bookings stay unchanged. Generate dates after saving.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <button disabled={busy} onClick={() => void run(load)}>
        Reload current rules
      </button>
      {config && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await request("/assessment-availability", {
                version: config.version,
                durationMinutes: config.duration_minutes,
                bufferBefore: config.buffer_before,
                bufferAfter: config.buffer_after,
                windows: config.windows,
              });
              await load();
              setNotice("Rules saved. Generate the dates you want to offer.");
            });
          }}
        >
          <fieldset disabled={busy}>
            <legend>Weekly appointment rules</legend>
            <label>
              Appointment duration (minutes)
              <input
                type="number"
                min={15}
                max={240}
                required
                value={config.duration_minutes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    duration_minutes: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Travel before (minutes)
              <input
                type="number"
                min={0}
                max={120}
                required
                value={config.buffer_before}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    buffer_before: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Travel after (minutes)
              <input
                type="number"
                min={0}
                max={120}
                required
                value={config.buffer_after}
                onChange={(e) =>
                  setConfig({ ...config, buffer_after: Number(e.target.value) })
                }
              />
            </label>
            {config.windows.map((w, i) => (
              <fieldset key={i}>
                <legend>Window {i + 1}</legend>
                <label>
                  Day
                  <select
                    value={w.day}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        windows: config.windows.map((v, j) =>
                          j === i ? { ...v, day: Number(e.target.value) } : v,
                        ),
                      })
                    }
                  >
                    {days.map((d, k) => (
                      <option value={k} key={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                {(["start", "end"] as const).map((key) => (
                  <label key={key}>
                    {key === "start" ? "Start" : "End"}
                    <input
                      type="time"
                      required
                      value={w[key]}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          windows: config.windows.map((v, j) =>
                            j === i ? { ...v, [key]: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      windows: config.windows.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove window {i + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              disabled={config.windows.length >= 14}
              onClick={() =>
                setConfig({
                  ...config,
                  windows: [
                    ...config.windows,
                    { day: 1, start: "09:00", end: "17:00" },
                  ],
                })
              }
            >
              Add weekly window
            </button>
            <button className="primary">Save rules</button>
          </fieldset>
        </form>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void run(async () => {
            const r = await request("/assessment-availability/generate", {
              from: data.get("from"),
              through: data.get("through"),
            });
            setNotice(
              `${r.created} appointments generated. Existing appointments were preserved.`,
            );
          });
        }}
      >
        <fieldset disabled={busy}>
          <legend>Offer appointment dates</legend>
          <label>
            From
            <input name="from" type="date" required />
          </label>
          <label>
            Through (up to 90 days)
            <input name="through" type="date" required />
          </label>
          <button>Generate appointments</button>
        </fieldset>
      </form>
      <h3>Blackouts</h3>
      <p>
        Blackout times use this device’s timezone (
        {Intl.DateTimeFormat().resolvedOptions().timeZone}). An overlapping
        confirmed booking must be resolved first.
      </p>
      {blackouts.map((b) => (
        <div className="schedule-row" key={b.id}>
          <span>
            {new Date(b.starts_at).toLocaleString()} –{" "}
            {new Date(b.ends_at).toLocaleString()} · {b.reason}
          </span>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await request(
                  "/assessment-availability/blackouts/" + b.id + "/archive",
                  {},
                );
                await load();
              })
            }
          >
            Remove blackout
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void run(async () => {
            await request("/assessment-availability/blackouts", {
              startsAt: new Date(String(data.get("start"))).toISOString(),
              endsAt: new Date(String(data.get("end"))).toISOString(),
              reason: data.get("reason"),
            });
            await load();
            setNotice(
              "Blackout saved. Affected unbooked appointments are unavailable.",
            );
          });
        }}
      >
        <fieldset disabled={busy}>
          <legend>Add blackout</legend>
          <label>
            Start
            <input type="datetime-local" name="start" required />
          </label>
          <label>
            End
            <input type="datetime-local" name="end" required />
          </label>
          <label>
            Reason
            <input name="reason" maxLength={500} required />
          </label>
          <button>Add blackout</button>
        </fieldset>
      </form>
    </details>
  );
}
