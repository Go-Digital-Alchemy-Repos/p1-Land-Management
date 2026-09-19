import React, { type ReactNode } from "react";
import * as dialog from "@/components/ui/dialog";
import { TeamUiProvider } from "./team-presentation";
export function TeamDialogHost({ children }: { children: ReactNode }) {
  return <TeamUiProvider value={dialog}>{children}</TeamUiProvider>;
}
