import { useEffect, useRef } from "react";
import {
  ACCESS_GROUPS,
  accessGroupState,
  selectAccessGroup,
} from "@workspace/api-zod/business-access";

function GroupCheckbox({
  state,
  label,
  disabled,
  onChange,
}: {
  state: "none" | "some" | "all";
  label: string;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.indeterminate = state === "some";
  }, [state]);
  return (
    <label className="permission-group-label">
      <input
        ref={input}
        type="checkbox"
        checked={state === "all"}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
export function AccessCheckboxes({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="access-checkboxes">
      {ACCESS_GROUPS.map((group) => (
        <details
          key={group.id}
          className="permission-group"
          open={accessGroupState(value, group.id) !== "none"}
        >
          <summary>
            {group.label}
            <span>
              {group.tools.filter((tool) => value.includes(tool.id)).length} /{" "}
              {group.tools.length}
            </span>
          </summary>
          <GroupCheckbox
            label={`Select all ${group.label} tools`}
            state={accessGroupState(value, group.id)}
            disabled={disabled}
            onChange={(checked) =>
              onChange(selectAccessGroup(value, group.id, checked))
            }
          />
          <div className="permission-tools">
            {group.tools.map((tool) => (
              <label key={tool.id}>
                <input
                  type="checkbox"
                  checked={value.includes(tool.id)}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...value, tool.id]
                        : value.filter((id) => id !== tool.id),
                    )
                  }
                />
                {tool.label}
              </label>
            ))}
          </div>
        </details>
      ))}
      <p className="muted">
        User administration, other users’ security, integration credentials, and
        website system tools are Owner-only. Personal profile and account
        security remain available to each user.
      </p>
    </div>
  );
}
