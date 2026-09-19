import React from "react";
import type { ComponentType, ReactNode } from "react";
export function IntegrationConfigurationFrame({
  ui,
  children,
  description = "Save credentials, review setup steps, and test supported connections.",
}: {
  ui: Record<string, ComponentType<any>>;
  children: ReactNode;
  description?: string;
}) {
  const { SheetHeader, SheetTitle, SheetDescription, SheetBody } = ui;
  return (
    <>
      <SheetHeader>
        <SheetTitle>Configure Integration</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>
      <SheetBody>{children}</SheetBody>
    </>
  );
}
