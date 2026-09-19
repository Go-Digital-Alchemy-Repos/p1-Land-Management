import { MapPin, Pencil, Trash2 } from "lucide-react";
import type { MenuItem } from "../../../../shared/schema/cms-menus";
export function countMenuItems(items: MenuItem[]): number {
  return items.reduce((total, item) => total + 1 + countMenuItems(item.children || []), 0);
}
export function MenuCardPresentation({
  name,
  id,
  locationLabel,
  items,
  onEdit,
  onDelete,
  disabled = false,
  editLabel = "Edit",
}: {
  name: string;
  id?: string;
  locationLabel: string;
  items: MenuItem[];
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  editLabel?: string;
}) {
  const count = countMenuItems(items);
  return (
    <article className="rounded-lg border bg-card" data-testid={`card-menu-${id}`}>
      <header className="flex items-start justify-between gap-3 p-6 pb-3">
        <div>
          <h3 className="text-base font-semibold">{name}</h3>
          <p className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 text-violet-500" />
            {locationLabel}
            <span>·</span>
            {count} item{count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            className="menu-location-manage flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm"
            data-testid={`button-edit-menu-${id}`}
            aria-label={`Edit ${name}`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5 text-blue-500" />
            {editLabel}
          </button>
          <button
            type="button"
            disabled={disabled}
            className="menu-location-manage rounded-md border px-3 py-1.5 text-sm text-destructive"
            data-testid={`button-delete-menu-${id}`}
            aria-label={`Delete ${name}`}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>
      {items.length > 0 && (
        <div className="px-6 pb-6 pt-0 text-xs text-muted-foreground space-y-0.5">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center gap-1">
              <span>{item.label || "(no label)"}</span>
              <span className="opacity-50">→</span>
              <span className="opacity-75 break-all">{item.url}</span>
              {item.children?.length > 0 && (
                <span className="opacity-50">(+{countMenuItems(item.children)} nested)</span>
              )}
            </div>
          ))}
          {items.length > 5 && <div className="opacity-50">...and {items.length - 5} more</div>}
        </div>
      )}
    </article>
  );
}
