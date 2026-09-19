import React, { type ComponentType, type HTMLAttributes, type ReactNode } from "react";

type Container = ComponentType<HTMLAttributes<HTMLDivElement>>;
const Div = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />;
export type FeatureAppField = { key: string; label: string; description: string };

/** Retained Feature Apps card. Hosts own grants, transport and toggle primitives. */
export function FeatureAppsEditor({ components = {}, fields, renderToggle, toolbar, notices }: {
  components?: Partial<Record<"Card" | "CardHeader" | "CardTitle" | "CardDescription" | "CardContent", Container>>;
  fields: readonly FeatureAppField[];
  renderToggle: (field: FeatureAppField) => ReactNode;
  toolbar: ReactNode;
  notices?: ReactNode;
}) {
  const { Card = Div, CardHeader = Div, CardTitle = Div, CardDescription = Div, CardContent = Div } = components;
  return <Card className="feature-apps-editor">
    <CardHeader className="feature-apps-header">
      <CardTitle className="feature-apps-title text-base">Feature Apps</CardTitle>
      <CardDescription className="feature-apps-description">These toggles hide or reveal major admin navigation and public entry routes. Existing data is preserved when an app is turned off.</CardDescription>
    </CardHeader>
    <CardContent className="feature-apps-content space-y-4">
      {notices}
      {fields.map(field => <div key={field.key} className="feature-apps-row flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="feature-apps-copy space-y-1">
          <label id={`feature-label-${field.key}`} htmlFor={`feature-${field.key}`} className="feature-apps-label text-sm font-medium">{field.label}</label>
          <p id={`feature-help-${field.key}`} className="feature-apps-help text-xs text-muted-foreground">{field.description}</p>
        </div>
        {renderToggle(field)}
      </div>)}
      <div className="feature-apps-toolbar flex gap-2 pt-2">{toolbar}</div>
    </CardContent>
  </Card>;
}
