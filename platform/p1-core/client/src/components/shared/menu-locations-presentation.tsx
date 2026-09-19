import { LayoutTemplate } from "lucide-react";
export function MenuLocationsPresentation({
  locations,
  menus,
  onManage,
  disabled = false,
  description,
}: {
  locations: { value: string; label: string }[];
  menus: { id?: string; name: string; location: string }[];
  onManage: (location: string, menuId?: string) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <section className="menu-locations-card rounded-lg border bg-card">
      <header className="p-6 pb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <LayoutTemplate className="h-5 w-5 text-violet-500" />
          Theme Locations
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {description ||
            "Each location can have one assigned menu, similar to a WordPress theme menu location."}
        </p>
      </header>
      <div className="grid gap-3 p-6 pt-0 sm:grid-cols-2">
        {locations.map((location) => {
          const assigned = menus.find((menu) => menu.location === location.value);
          const legacy = menus.find(
            (menu) =>
              menu.location === (location.value === "main_navigation" ? "header" : "footer"),
          );
          const display = assigned || legacy;
          return (
            <div
              key={location.value}
              className="rounded-lg border p-4"
              data-testid={`card-menu-location-${location.value}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{location.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {assigned?.name ||
                      (legacy
                        ? `${legacy.name} (${location.value === "main_navigation" ? "legacy header menu" : "legacy footer menu"})`
                        : "No menu assigned yet")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  className="menu-location-manage rounded-md border px-3 py-1.5 text-sm"
                  onClick={() => onManage(location.value, display?.id)}
                  data-testid={`button-manage-location-${location.value}`}
                >
                  {assigned ? "Edit" : legacy ? "Edit Legacy" : "Assign"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
