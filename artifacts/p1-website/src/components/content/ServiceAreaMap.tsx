import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, LocateFixed, MapPin } from "lucide-react";
import locations from "@/lib/service-locations.json";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import "./service-area-map.css";

type Region = "all" | "NC" | "SC";
const regionLabels: Record<Region, string> = { all: "All locations", NC: "North Carolina", SC: "South Carolina" };
const mapStyle = "https://tiles.openfreemap.org/styles/positron";
const pinSvg = '<svg viewBox="0 0 28 36" width="28" height="36" aria-hidden="true"><path d="M14 34S2 22 2 14a12 12 0 1 1 24 0c0 8-12 20-12 20Z" fill="currentColor" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="4" fill="white"/></svg>';

export function ServiceAreaMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const markers = useRef<{ path: string; state: string; marker: Marker }[]>([]);
  const [region, setRegion] = useState<Region>("all");
  const [selectedPath, setSelectedPath] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const filtered = locations.filter(location => region === "all" || location.state === region);
  const selected = locations.find(location => location.path === selectedPath);

  function fitRegion(nextRegion: Region) {
    const points = locations.filter(location => nextRegion === "all" || location.state === nextRegion);
    map.current?.fitBounds([
      [Math.min(...points.map(p => p.coordinates[0])), Math.min(...points.map(p => p.coordinates[1]))],
      [Math.max(...points.map(p => p.coordinates[0])), Math.max(...points.map(p => p.coordinates[1]))],
    ], { padding: { top: 65, bottom: 45, left: 45, right: 45 }, maxZoom: 10, duration: 0 });
  }

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(async entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      try {
        const [library, worker] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
          import("maplibre-gl/dist/maplibre-gl.css"),
        ]);
        if (disposed) return;
        library.setWorkerUrl(worker.default);
        const instance = new library.Map({
          container: element, style: mapStyle, center: [-81.6, 35.05], zoom: 7,
          maxZoom: 14, minZoom: 5, renderWorldCopies: false,
          dragRotate: false, pitchWithRotate: false, touchPitch: false,
          cooperativeGestures: true, attributionControl: false,
        });
        map.current = instance;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new library.NavigationControl({ showCompass: false }), "top-right");
        instance.addControl(new library.AttributionControl({ compact: false }), "bottom-right");
        instance.getCanvas().setAttribute("aria-label", "Service locations map. Use arrow keys to pan and plus or minus to zoom.");
        instance.getCanvas().setAttribute("aria-describedby", "service-map-help");
        markers.current = locations.map(location => {
          const link = document.createElement("a");
          link.href = location.path;
          link.className = `service-map-pin service-map-pin--${location.state.toLowerCase()}`;
          const label = `${location.name}, ${location.state}${location.kind === "community" ? "" : " overview"}`;
          link.setAttribute("aria-label", `View ${label} service area`);
          link.title = `View ${label}`;
          link.innerHTML = pinSvg;
          const tooltip = document.createElement("span");
          tooltip.className = "service-map-pin-label";
          tooltip.textContent = label;
          link.append(tooltip);
          const marker = new library.Marker({ element: link, anchor: "bottom" })
            .setLngLat([location.coordinates[0], location.coordinates[1]]).addTo(instance);
          return { path: location.path, state: location.state, marker };
        });
        fitRegion("all");
        timeout = setTimeout(() => { if (!disposed) setStatus("error"); }, 20000);
        instance.on("load", () => {
          clearTimeout(timeout);
          if (!disposed) setStatus("ready");
        });
        // A missing tile should not disable otherwise working map links.
        instance.on("error", () => { if (!disposed && !instance.isStyleLoaded()) setStatus("error"); });
        resizeObserver = new ResizeObserver(() => instance.resize());
        resizeObserver.observe(element);
      } catch {
        if (!disposed) setStatus("error");
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer.disconnect();
      resizeObserver?.disconnect();
      markers.current.forEach(({ marker }) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  function changeRegion(nextRegion: Region) {
    setRegion(nextRegion);
    setSelectedPath("");
    markers.current.forEach(({ state, marker }) => {
      marker.getElement().hidden = nextRegion !== "all" && state !== nextRegion;
      marker.getElement().classList.remove("is-selected");
    });
    fitRegion(nextRegion);
  }

  function selectLocation(path: string) {
    setSelectedPath(path);
    const location = locations.find(item => item.path === path);
    markers.current.forEach(({ path: markerPath, marker }) => marker.getElement().classList.toggle("is-selected", markerPath === path));
    if (location) map.current?.jumpTo({ center: [location.coordinates[0], location.coordinates[1]], zoom: 11 });
    else fitRegion(region);
  }

  return (
    <section aria-labelledby="service-map-heading" className="w-full overflow-hidden bg-card">
      <div className="relative border-y border-border bg-[#e9efed]">
        <div ref={container} className="service-area-map h-[440px] w-full sm:h-[560px]" aria-describedby="service-map-help" />
        {status !== "ready" && <p role="status" className="absolute bottom-12 left-4 right-14 rounded bg-white/95 p-3 text-sm text-secondary shadow sm:left-6 sm:right-auto">
          {status === "loading" ? "Loading service locations…" : "Map unavailable? Browse all service locations below."}
        </p>}
        <button type="button" onClick={() => changeRegion("all")} disabled={status === "loading"} className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded bg-white px-4 text-sm font-semibold text-secondary shadow hover:bg-muted disabled:opacity-60">
          <LocateFixed aria-hidden="true" className="h-4 w-4" /> Show all locations
        </button>
      </div>
      <div className="site-shell flex flex-col gap-6 py-6 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">Across the Carolinas</p>
          <h1 id="service-map-heading" className="font-display text-3xl text-secondary sm:text-4xl">Find Your Service Area</h1>
          <p id="service-map-help" className="mt-3 text-secondary/75">Select a pin to explore local services. Zoom in for nearby communities.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter map by state">
          {(["all", "NC", "SC"] as const).map(value => (
            <button key={value} type="button" disabled={status === "loading"} aria-pressed={region === value} onClick={() => changeRegion(value)}
              className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${region === value ? "border-primary bg-primary text-white" : "border-border text-secondary hover:bg-muted"}`}>
              {regionLabels[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="site-shell flex flex-col gap-5 pb-6 sm:pb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-secondary">
            <span className="inline-flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4 text-primary" /> North Carolina</span>
            <span className="inline-flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4 text-[#a95329]" /> South Carolina</span>
          </p>
          <p className="text-xs text-muted-foreground">Pins mark communities and regional overviews, not office addresses or coverage boundaries.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="service-map-location" className="text-sm font-semibold text-secondary">Find a location</label>
          <select id="service-map-location" disabled={status === "loading"} value={selectedPath} onChange={event => selectLocation(event.target.value)} className="min-h-11 min-w-0 rounded border border-border bg-background px-3 text-sm text-secondary sm:max-w-64">
            <option value="">Choose a location</option>
            {filtered.map(location => <option key={location.path} value={location.path}>{location.name}, {location.state}</option>)}
          </select>
        </div>
      </div>
      {selected && <div className="border-t border-border bg-primary/5 px-6 py-4 sm:px-8" aria-live="polite">
        <Link href={selected.path} className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline underline-offset-4">Explore {selected.name}, {selected.state} <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>}
      <details className="site-shell border-t border-border py-4" open={status === "error" ? true : undefined}>
        <summary className="w-fit cursor-pointer py-2 text-sm font-semibold text-primary">Browse all {locations.length} service locations</summary>
        <ul className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map(location => <li key={location.path}><Link href={location.path} className="inline-flex min-h-11 items-center text-sm text-secondary underline-offset-4 hover:text-primary hover:underline">{location.name}, {location.state}</Link></li>)}
        </ul>
      </details>
    </section>
  );
}
