import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { BrandingTab, type BrandingSubview } from "./settings-page";

type SettingsData = Record<string, Record<string, { value: string; isSecret: boolean }>>;

const DESIGN_COPY: Record<BrandingSubview, { title: string; description: string }> = {
  branding: {
    title: "Branding",
    description:
      "Manage public-facing identity assets for the website and keep brand controls grouped in one place.",
  },
  "social-media": {
    title: "Social Media",
    description:
      "Add social profile links and choose how social icons appear across the public website.",
  },
  colors: {
    title: "Color Palette",
    description:
      "Control the public site color system, including semantic typography colors and branded UI surfaces.",
  },
  typography: {
    title: "Typography",
    description:
      "Choose the frontend heading and body fonts with inline previews for each Google Font option.",
  },
};

export default function AdminDesignPage({ initialSubview }: { initialSubview: BrandingSubview }) {
  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/admin/settings"],
  });

  const copy = DESIGN_COPY[initialSubview];

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-5xl">
        <h1 className="text-2xl font-heading font-bold mb-1" data-testid="text-design-title">
          {copy.title}
        </h1>
        <p className="text-muted-foreground mb-6" data-testid="text-design-description">
          {copy.description}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <BrandingTab
            settings={settings || {}}
            initialSubtab={initialSubview}
            showHeader={false}
          />
        )}
      </div>
    </AdminSidebar>
  );
}
