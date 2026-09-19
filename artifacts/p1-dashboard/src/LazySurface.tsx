import React, { Component, Suspense, type ReactNode } from "react";

export function requestDashboardReload(
  reload = () => window.location.reload(),
) {
  if (
    !window.dispatchEvent(
      new Event("p1:before-navigation", { cancelable: true }),
    )
  )
    return;
  // A failed subtree may already have unmounted its draft guard. Require an
  // explicit warning even when no mounted editor cancels the navigation event.
  if (
    window.confirm(
      "Reload the dashboard to load the current version? Unsaved changes may be lost. Cancel to keep other open work on this page.",
    )
  )
    reload();
}

class SurfaceErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; asset: boolean }
> {
  state = { failed: false, asset: false };
  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return {
      failed: true,
      asset:
        /Unable to preload CSS|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [^ ]+ failed|Failed to load module script/i.test(
          message,
        ),
    };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="panel" role="alert" aria-label="Tool recovery">
          <h2>
            {this.state.asset
              ? "This tool could not be loaded"
              : "This tool encountered a problem"}
          </h2>
          <p>
            {this.state.asset
              ? "A dashboard update or interrupted connection may have made this tool unavailable."
              : "The tool could not continue. Try another tool or reload when ready."}{" "}
            Your dashboard has not been reloaded.
          </p>
          <p>
            You can continue using other tools. When ready, reload to get the
            current version. Unsaved changes may be lost when you reload.
          </p>
          <button type="button" onClick={() => requestDashboardReload()}>
            Reload dashboard
          </button>
        </section>
      );
    return this.props.children;
  }
}

/** A local boundary preserves the shell and sibling editors when a lazy import rejects. */
export function LazySurface({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <SurfaceErrorBoundary
      key={React.isValidElement(children) ? children.key : undefined}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </SurfaceErrorBoundary>
  );
}
