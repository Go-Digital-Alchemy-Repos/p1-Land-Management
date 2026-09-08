import App from "../App.server";
import { CmsProvider, type CmsCollection, type CmsSnapshot } from "./cms";
export function ServerCmsApp({
  path,
  snapshot,
  collect,
}: {
  path: string;
  snapshot: CmsSnapshot;
  collect?: CmsCollection;
}) {
  return (
    <CmsProvider snapshot={snapshot} collect={collect}>
      <App ssrPath={path} />
    </CmsProvider>
  );
}
