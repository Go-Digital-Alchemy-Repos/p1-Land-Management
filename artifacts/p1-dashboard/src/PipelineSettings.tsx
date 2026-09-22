import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getSalesPipelineSettings,
  saveSalesPipelineSettings,
} from "@workspace/api-client-react/dashboard";
import {
  defaultPipelineConfig,
  pipelineConfigSchema,
  pipelineColors,
} from "@workspace/api-zod/pipeline-settings";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import "./pipeline-settings.css";
type State = Awaited<ReturnType<typeof getSalesPipelineSettings>>;
type Config = State["config"];
const colors = {
  blue: "#2563eb",
  cyan: "#0891b2",
  emerald: "#059669",
  amber: "#b45309",
  green: "#15803d",
  slate: "#64748b",
};
const Context = createContext<{
  state: State | null;
  error: boolean;
  reload: () => Promise<void>;
  accept: (state: State) => void;
}>({ state: null, error: false, reload: async () => {}, accept: () => {} });
export function PipelineProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(false);
  const live = useRef(true),
    generation = useRef(0);
  async function reload() {
    if (!enabled) return;
    const id = ++generation.current;
    try {
      const data = await getSalesPipelineSettings({
        signal: AbortSignal.timeout(30000),
      });
      pipelineConfigSchema.parse(data.config);
      if (live.current && generation.current === id) {
        setState(data);
        setError(false);
      }
    } catch {
      if (live.current && generation.current === id) setError(true);
      throw Error("Pipeline settings unavailable");
    }
  }
  useEffect(() => {
    live.current = true;
    setState(null);
    setError(false);
    if (enabled) void reload().catch(() => {});
    return () => {
      live.current = false;
      generation.current++;
    };
  }, [enabled]);
  return (
    <Context.Provider
      value={{
        state,
        error,
        reload,
        accept: (next) => {
          generation.current++;
          setState(next);
          setError(false);
        },
      }}
    >
      {error && (
        <p className="notice" role="status">
          Pipeline settings could not refresh.{" "}
          {state
            ? "Last loaded settings remain visible."
            : "Default stage labels are shown."}
        </p>
      )}
      {children}
    </Context.Provider>
  );
}
export function usePipelineStages() {
  return (useContext(Context).state?.config ?? defaultPipelineConfig).stages;
}
export function PipelineStage({ value }: { value: string }) {
  const stages = usePipelineStages(),
    stage = stages.find((s) => s.key === value);
  return (
    <span
      className="pipeline-stage"
      style={{ color: stage ? colors[stage.color] : undefined }}
    >
      {stage?.label ?? value}
    </span>
  );
}
export function PipelineSettingsEditor({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const { state, error, reload, accept } = useContext(Context);
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<Config | null>(null),
    [base, setBase] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [message, setMessage] = useState(""),
    [discard, setDiscard] = useState(false);
  const initialOpenApplied = useRef(false),
    gate = useRef(false),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const dirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(base?.config);
  useCmsUnsavedChanges(
    dirty || busy || blocked,
    "Leave pipeline settings? Your unsaved changes will be lost.",
  );
  const parsed = pipelineConfigSchema.safeParse(draft);
  function begin() {
    if (!state || error) return;
    setBase(state);
    setDraft(structuredClone(state.config));
    setOpen(true);
    setMessage("");
    setBlocked(false);
  }
  useEffect(() => {
    if (!initiallyOpen) {
      initialOpenApplied.current = false;
    } else if (state && !error && !initialOpenApplied.current) {
      initialOpenApplied.current = true;
      begin();
    }
  }, [initiallyOpen, state, error]);
  async function save() {
    if (gate.current || !base || !parsed.success || blocked) return;
    gate.current = true;
    setBusy(true);
    setMessage("");
    try {
      const next = await saveSalesPipelineSettings(
        { expectedRevision: base.revision, config: parsed.data },
        { signal: AbortSignal.timeout(30000) },
      );
      pipelineConfigSchema.parse(next.config);
      if (live.current) {
        accept(next);
        setBase(next);
        setDraft(structuredClone(next.config));
        setMessage("Pipeline settings saved.");
      }
    } catch {
      if (live.current) {
        setBlocked(true);
        setMessage(
          "Save was not confirmed. Your draft is retained. Reload saved settings before trying again.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function refresh() {
    if (gate.current || (dirty && !discard)) return;
    gate.current = true;
    setBusy(true);
    try {
      await reload();
      if (live.current) {
        setOpen(false);
        setDraft(null);
        setBase(null);
        setBlocked(false);
        setDiscard(false);
        setMessage(
          "Saved settings reloaded. Reopen the editor to review them.",
        );
      }
    } catch {
      if (live.current) setMessage("Could not reload. Your draft is retained.");
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  function update(index: number, patch: Partial<Config["stages"][number]>) {
    setDraft((old) =>
      old
        ? {
            ...old,
            stages: old.stages.map((s, i) =>
              i === index ? { ...s, ...patch } : s,
            ),
          }
        : old,
    );
    setMessage("");
  }
  function move(index: number, delta: number) {
    if (!draft) return;
    const stages = [...draft.stages];
    [stages[index], stages[index + delta]] = [
      stages[index + delta],
      stages[index],
    ];
    setDraft({ ...draft, stages });
    setMessage("");
  }
  return (
    <section className="panel pipeline-settings" aria-label="Pipeline settings">
      <div className="panel-heading">
        <div>
          <h2>Pipeline settings</h2>
          <p>
            Customize labels, colors and display order. The six lifecycle stages
            remain fixed.
          </p>
        </div>
        {!open && (
          <button disabled={!state || error || busy} onClick={begin}>
            Edit pipeline
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {(!state || error) && (
        <button disabled={busy} onClick={() => void refresh()}>
          Reload pipeline settings
        </button>
      )}
      {open && draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy || blocked}>
            <legend>Stage presentation</legend>
            {draft.stages.map((stage, index) => (
              <div className="pipeline-settings-row" key={stage.key}>
                <div>
                  <strong>{stage.key}</strong>
                  {(stage.key === "won" || stage.key === "lost") && (
                    <small>
                      {stage.key === "won"
                        ? "Won outcome; customer onboarding remains a separate action."
                        : "Lost outcome; no customer onboarding."}
                    </small>
                  )}
                </div>
                <label>
                  Label
                  <input
                    aria-label={`${stage.key} label`}
                    maxLength={40}
                    value={stage.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                  />
                </label>
                <label>
                  Color
                  <select
                    aria-label={`${stage.key} color`}
                    value={stage.color}
                    onChange={(e) =>
                      update(index, {
                        color: e.target.value as typeof stage.color,
                      })
                    }
                  >
                    {pipelineColors.map((color) => (
                      <option key={color}>{color}</option>
                    ))}
                  </select>
                </label>
                <span style={{ color: colors[stage.color] }}>
                  {stage.label}
                </span>
                <div className="pipeline-settings-order">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move ${stage.key} up`}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === 5}
                    aria-label={`Move ${stage.key} down`}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </fieldset>
          {!parsed.success && (
            <p className="error" role="alert">
              {parsed.error.issues[0]?.message}
            </p>
          )}
          <div className="pipeline-settings-actions">
            <button
              type="submit"
              disabled={busy || blocked || !dirty || !parsed.success}
            >
              Save pipeline
            </button>
            <button
              type="button"
              disabled={busy || blocked}
              onClick={() => setDraft(structuredClone(defaultPipelineConfig))}
            >
              Use default presentation
            </button>
            <button
              type="button"
              disabled={busy || dirty || blocked}
              onClick={() => setOpen(false)}
            >
              Close editor
            </button>
          </div>
          {dirty && (
            <label>
              <input
                type="checkbox"
                checked={discard}
                onChange={(e) => setDiscard(e.target.checked)}
              />{" "}
              Discard my draft when reloading saved settings
            </label>
          )}
          <button
            type="button"
            disabled={busy || (dirty && !discard)}
            onClick={() => void refresh()}
          >
            Reload saved settings
          </button>
        </form>
      )}
    </section>
  );
}
