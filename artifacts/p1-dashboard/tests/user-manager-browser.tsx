import { createRoot } from "react-dom/client";
import { UserManager } from "../src/UserManager";
import "../src/style.css";
createRoot(document.getElementById("root")!).render(
  <UserManager
    currentUserId="owner"
    clients={[]}
    onSessionChanged={async () => {}}
  />,
);
