import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminSidebar } from "../admin-sidebar";
export default function ClientSitePagesPage() {
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery<Array<{ routeId: string; path: string; componentKey: string; label: string }>>({
    queryKey: ["/api/admin/client-site-content"],
  });
  return (
    <AdminSidebar>
      <main className="space-y-5 p-6">
        <h1 className="text-2xl font-semibold">P1 website content</h1>
        <p>Edit published pages and shared navigation without a code deployment.</p>
        {isLoading ? (
          <p>Loading pages…</p>
        ) : isError ? (
          <p role="alert">Could not load website pages.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.map((item) => (
              <li key={`${item.routeId}:${item.componentKey}`}>
                <Link
                  className="block rounded border p-4 hover:bg-muted"
                  href={`/admin/cms/website/${item.routeId}/${item.componentKey}`}
                >
                  <strong>{item.label}</strong>
                  <br />
                  {item.path}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AdminSidebar>
  );
}
