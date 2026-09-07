import { AdminSidebar } from "./admin-sidebar";
import { SpecializationsTab } from "./settings-page";
import { useDirectorySettings } from "@/hooks/use-directory-settings";

export default function AdminSpecializationsPage() {
  const { settings: directorySettings } = useDirectorySettings();
  const specialtyLabelPlural = directorySettings.specialtyLabelPlural || "Specializations";

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-4xl">
        <h1
          className="text-2xl font-heading font-bold mb-1"
          data-testid="text-specializations-page-title"
        >
          {specialtyLabelPlural}
        </h1>
        <p
          className="text-muted-foreground mb-6"
          data-testid="text-specializations-page-description"
        >
          Manage the {specialtyLabelPlural.toLowerCase()} taxonomy used in{" "}
          {directorySettings.participantLabelPlural.toLowerCase()} profiles and directory filters.
        </p>
        <SpecializationsTab showHeader={false} />
      </div>
    </AdminSidebar>
  );
}
