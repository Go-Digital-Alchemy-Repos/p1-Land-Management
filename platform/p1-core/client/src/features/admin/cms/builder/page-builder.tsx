import React from "react";
import { CoreBuilderHost } from "./core-builder-host";
import { PageBuilderWorkspace } from "./page-builder-workspace";
export function PageBuilder({
  disabled = false,
  ...props
}: React.ComponentProps<typeof PageBuilderWorkspace> & { disabled?: boolean }) {
  return (
    <div
      ref={(node) => {
        if (node) node.inert = disabled;
      }}
      aria-disabled={disabled || undefined}
    >
      <CoreBuilderHost>
        <PageBuilderWorkspace
          key={String(disabled)}
          {...props}
          onChange={(content) => {
            if (!disabled) props.onChange(content);
          }}
        />
      </CoreBuilderHost>
    </div>
  );
}
