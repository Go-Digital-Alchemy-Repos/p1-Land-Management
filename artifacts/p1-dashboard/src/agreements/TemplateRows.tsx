import type { AgreementTemplateKind } from "../../../../lib/api-client-react/src/dashboard/models";
import type { Draft } from "./template-draft";
function move<T>(rows: T[], index: number, delta: number) {
  const next = [...rows];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}
export function TemplateRows({
  kind,
  value,
  patch,
}: {
  kind: AgreementTemplateKind;
  value: Pick<Draft, "scope" | "costs">;
  patch: (value: Partial<Pick<Draft, "scope" | "costs">>) => void;
}) {
  return (
    <>
      {" "}
      {kind === "scope" && (
        <>
          <h3>Scope items</h3>
          {value.scope.items.map((item, index) => (
            <fieldset key={item.id}>
              <legend>Scope item {index + 1}</legend>
              <label>
                Title
                <input
                  required
                  value={item.title}
                  onChange={(e) =>
                    patch({
                      scope: {
                        ...value.scope,
                        items: value.scope.items.map((row) =>
                          row.id === item.id
                            ? { ...row, title: e.target.value }
                            : row,
                        ),
                      },
                    })
                  }
                />
              </label>
              <label>
                Deliverables
                <textarea
                  aria-label="Deliverables"
                  value={item.description}
                  onChange={(e) =>
                    patch({
                      scope: {
                        ...value.scope,
                        items: value.scope.items.map((row) =>
                          row.id === item.id
                            ? { ...row, description: e.target.value }
                            : row,
                        ),
                      },
                    })
                  }
                />
              </label>
              <div className="template-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    patch({
                      scope: {
                        ...value.scope,
                        items: move(value.scope.items, index, -1),
                      },
                    })
                  }
                >
                  Move scope {index + 1} up
                </button>
                <button
                  type="button"
                  disabled={index === value.scope.items.length - 1}
                  onClick={() =>
                    patch({
                      scope: {
                        ...value.scope,
                        items: move(value.scope.items, index, 1),
                      },
                    })
                  }
                >
                  Move scope {index + 1} down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm("Remove this scope item from the draft?")
                    )
                      patch({
                        scope: {
                          ...value.scope,
                          items: value.scope.items.filter(
                            (row) => row.id !== item.id,
                          ),
                        },
                      });
                  }}
                >
                  Remove scope {index + 1}
                </button>
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              patch({
                scope: {
                  ...value.scope,
                  items: [
                    ...value.scope.items,
                    { id: crypto.randomUUID(), title: "", description: "" },
                  ],
                },
              })
            }
          >
            Add scope item
          </button>
          <label>
            Exclusions
            <textarea
              aria-label="Exclusions"
              value={value.scope.exclusions}
              onChange={(e) =>
                patch({
                  scope: { ...value.scope, exclusions: e.target.value },
                })
              }
            />
          </label>
        </>
      )}
      {kind === "cost" && (
        <>
          <h3>Cost rows</h3>
          <p>
            Amounts are USD. One-time, monthly and per-visit rates remain
            separate; no combined contract total is implied.
          </p>
          {value.costs.map((item, index) => (
            <fieldset key={item.id}>
              <legend>Cost row {index + 1}</legend>
              {(
                [
                  ["description", "Service"],
                  ["unit", "Unit"],
                  ["quantity", "Quantity"],
                  ["amount", "Unit price (USD)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={key !== "unit"}
                    inputMode={
                      key === "amount" || key === "quantity"
                        ? "decimal"
                        : undefined
                    }
                    value={item[key]}
                    onChange={(e) =>
                      patch({
                        costs: value.costs.map((row) =>
                          row.id === item.id
                            ? { ...row, [key]: e.target.value }
                            : row,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                Billing basis
                <select
                  aria-label={`Billing basis ${index + 1}`}
                  value={item.basis}
                  onChange={(e) =>
                    patch({
                      costs: value.costs.map((row) =>
                        row.id === item.id
                          ? {
                              ...row,
                              basis: e.target.value as typeof row.basis,
                            }
                          : row,
                      ),
                    })
                  }
                >
                  <option value="one_time">One-time</option>
                  <option value="fixed_monthly">Fixed monthly</option>
                  <option value="per_visit">Per visit</option>
                </select>
              </label>
              <div className="template-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => patch({ costs: move(value.costs, index, -1) })}
                >
                  Move cost {index + 1} up
                </button>
                <button
                  type="button"
                  disabled={index === value.costs.length - 1}
                  onClick={() => patch({ costs: move(value.costs, index, 1) })}
                >
                  Move cost {index + 1} down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this cost row from the draft?"))
                      patch({
                        costs: value.costs.filter((row) => row.id !== item.id),
                      });
                  }}
                >
                  Remove cost {index + 1}
                </button>
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              patch({
                costs: [
                  ...value.costs,
                  {
                    id: crypto.randomUUID(),
                    description: "",
                    unit: "",
                    quantity: "1",
                    amount: "0.00",
                    basis: "one_time",
                  },
                ],
              })
            }
          >
            Add cost row
          </button>
        </>
      )}
    </>
  );
}
