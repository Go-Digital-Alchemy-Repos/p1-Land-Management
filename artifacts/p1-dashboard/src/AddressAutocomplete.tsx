import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./address-autocomplete.css";

export type AddressSuggestion = {
  id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  businessName: string | null;
};

type Props = {
  label: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onAddressSelect?: (
    address: AddressSuggestion,
    input: HTMLInputElement,
  ) => void;
  format?: "full" | "line1";
  completeOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  placeholder?: string;
};

/** Suggestions are optional assistance; typing and saving an address always remain possible. */
export function AddressAutocomplete({
  label,
  name,
  value,
  defaultValue = "",
  onValueChange,
  onAddressSelect,
  format = "full",
  completeOnly = false,
  required,
  disabled,
  maxLength = 200,
  autoComplete = "street-address",
  placeholder,
}: Props) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const [localValue, setLocalValue] = useState(defaultValue);
  const currentValue = value === undefined ? localValue : value;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >("idle");
  const [chosen, setChosen] = useState(false);
  const sequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled || query.trim().length < 3) {
      setItems([]);
      setOpen(false);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const requestId = ++sequence.current;
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/v1/address-suggestions?q=${encodeURIComponent(query.trim())}`,
          {
            signal: controller.signal,
            credentials: "same-origin",
          },
        );
        if (!response.ok) throw new Error("Suggestions unavailable");
        const data = (await response.json()) as {
          available: boolean;
          suggestions: AddressSuggestion[];
        };
        if (requestId !== sequence.current) return;
        const suggestions = data.available
          ? data.suggestions.filter(
              (item) =>
                !completeOnly ||
                Boolean(
                  item.line1 && item.city && item.state && item.postalCode,
                ),
            )
          : [];
        setItems(suggestions);
        setActive(-1);
        setStatus(data.available ? "ready" : "unavailable");
        setOpen(true);
      } catch {
        if (!controller.signal.aborted && requestId === sequence.current) {
          setItems([]);
          setStatus("unavailable");
          setOpen(true);
        }
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      sequence.current += 1;
    };
  }, [completeOnly, disabled, query]);

  const update = (next: string) => {
    if (value === undefined) setLocalValue(next);
    onValueChange?.(next);
    setChosen(false);
    setQuery(next);
  };
  const choose = (item: AddressSuggestion) => {
    const next = format === "line1" ? item.line1 : item.label;
    if (value === undefined) setLocalValue(next);
    onValueChange?.(next);
    if (inputRef.current) onAddressSelect?.(item, inputRef.current);
    setChosen(true);
    setQuery("");
    setItems([]);
    setOpen(false);
    setActive(-1);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current + items.length - 1) % items.length);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="address-autocomplete" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={inputId}>{label}</label>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        value={currentValue}
        onChange={(event) => update(event.target.value)}
        onKeyDown={keyDown}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
        aria-controls={open && items.length ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
      />
      {open && (
        <div className="address-autocomplete-popover">
          {items.length > 0 && (
            <div id={listId} role="listbox" aria-label="Address suggestions">
              {items.map((item, index) => (
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  key={`${item.id}-${index}`}
                  role="option"
                  aria-selected={active === index}
                  className="address-autocomplete-option"
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse") event.preventDefault();
                  }}
                  onClick={() => choose(item)}
                >
                  <strong>{item.businessName || item.line1}</strong>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
          {status === "ready" && !items.length && (
            <p>No matching address. Continue entering it manually.</p>
          )}
          {status === "unavailable" && (
            <p>
              Suggestions unavailable. Continue entering the address manually.
            </p>
          )}
          {status === "loading" && <p role="status">Looking up addresses…</p>}
        </div>
      )}
      {(status === "ready" || chosen) && (
        <small className="address-autocomplete-credit">
          Address data ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap contributors
          </a>{" "}
          · Powered by{" "}
          <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
            Geoapify
          </a>
        </small>
      )}
    </div>
  );
}
