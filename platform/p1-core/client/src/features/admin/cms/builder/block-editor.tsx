import React from "react";
import { CoreBuilderHost } from "./core-builder-host";
import { BlockEditor as Editor, ResilientBlockEditor as Resilient } from "./block-editor-workspace";
export { createFallbackBlockDef } from "../../../../../../shared/cms-builder/fallback-block";
export function BlockEditor(props: React.ComponentProps<typeof Editor>) {
  return (
    <CoreBuilderHost>
      <Editor {...props} />
    </CoreBuilderHost>
  );
}
export function ResilientBlockEditor(props: React.ComponentProps<typeof Resilient>) {
  return (
    <CoreBuilderHost>
      <Resilient {...props} />
    </CoreBuilderHost>
  );
}
