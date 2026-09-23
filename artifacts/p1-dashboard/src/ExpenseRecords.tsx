import { useMemo, useState } from "react";

type Expense = {
  id: string;
  description: string;
  category: string;
  amount_cents: number;
  incurred_on: string;
  property_name: string;
};

function date(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "numeric", day: "numeric", year: "numeric",
  }).format(parsed);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function ExpenseRecords({ records }: { records: Expense[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => [...new Set(records.map((record) => record.category).filter(Boolean))].sort(), [records]);
  const visible = records.filter((record) =>
    (!category || record.category === category) &&
    `${record.description} ${record.property_name} ${record.category}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()),
  );
  return <div className="expense-records">
    <div className="expense-record-controls">
      <label>Search expenses<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Property or description" /></label>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    </div>
    {!records.length ? <p className="empty">No expenses yet.</p> : !visible.length ? <p className="empty">No expenses match these filters.</p> :
      <div className="expense-record-list">{visible.map((record) => <article className="expense-record" key={record.id}>
        <details>
          <summary><span><strong>{record.description}</strong><small>{record.property_name} · {date(record.incurred_on)}</small></span><span className="expense-record-amount">{money(record.amount_cents)}</span></summary>
          <dl><div><dt>Property</dt><dd>{record.property_name}</dd></div><div><dt>Category</dt><dd>{record.category}</dd></div><div><dt>Incurred</dt><dd>{date(record.incurred_on)}</dd></div><div><dt>Amount</dt><dd>{money(record.amount_cents)}</dd></div></dl>
        </details>
      </article>)}</div>}
  </div>;
}
