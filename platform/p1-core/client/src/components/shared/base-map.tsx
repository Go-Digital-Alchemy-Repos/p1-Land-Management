import { useCallback, useEffect, useRef, type ReactNode } from "react";
import Map, { NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MAP_STYLE_URL, applyLightMapStyle } from "@/lib/map-style";

export function BaseMap({
  center,
  zoom,
  bounds,
  interactive = true,
  collapseAttribution = false,
  children,
}: {
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  interactive?: boolean;
  collapseAttribution?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<MapRef>(null);
  const container = useRef<HTMLDivElement>(null);
  const west = bounds?.[0][0];
  const south = bounds?.[0][1];
  const east = bounds?.[1][0];
  const north = bounds?.[1][1];
  const latitude = center[0];
  const longitude = center[1];
  const updateCamera = useCallback(() => {
    const map = ref.current;
    if (!map) return;
    if (west !== undefined && south !== undefined && east !== undefined && north !== undefined) {
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          // Leave room for the full pin above its coordinate and the map controls.
          padding: { top: 64, bottom: 40, left: 40, right: 40 },
          maxZoom: 16,
          duration: 0,
        },
      );
    } else {
      map.jumpTo({ center: [longitude, latitude], zoom });
    }
  }, [west, south, east, north, latitude, longitude, zoom]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(() => {
      ref.current?.resize();
      if (west !== undefined) updateCamera();
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [west, updateCamera]);
  useEffect(updateCamera, [updateCamera]);
  return (
    <div ref={container} className="h-full w-full">
      <Map
        ref={ref}
        workerUrl={workerUrl}
        initialViewState={{ latitude: center[0], longitude: center[1], zoom }}
        mapStyle={MAP_STYLE_URL}
        attributionControl={collapseAttribution ? { compact: true } : undefined}
        onLoad={({ target }) => {
          updateCamera();
          if (collapseAttribution) {
            // MapLibre opens compact attribution on initialization. Collapse only once;
            // subsequent clicks and keyboard activation retain the native control behavior.
            const attribution = target
              .getContainer()
              .querySelector<HTMLDetailsElement>("details.maplibregl-ctrl-attrib");
            if (attribution) {
              attribution.open = false;
              attribution.classList.remove("maplibregl-compact-show");
            }
          }
          const original = target.getStyle();
          const styled = applyLightMapStyle(undefined, original);
          styled.layers.forEach((layer, index) => {
            if (layer === original.layers[index] || !layer.paint) return;
            Object.entries(layer.paint).forEach(([property, value]) =>
              target.setPaintProperty(
                layer.id,
                property as Parameters<typeof target.setPaintProperty>[1],
                value,
              ),
            );
          });
        }}
        scrollZoom={interactive}
        dragPan={interactive}
        doubleClickZoom={interactive}
        keyboard={interactive}
        boxZoom={interactive}
        touchZoomRotate={interactive}
        dragRotate={false}
        touchPitch={false}
        style={{ height: "100%", width: "100%" }}
      >
        {interactive && <NavigationControl position="top-left" showCompass={false} />}
        {children}
      </Map>
    </div>
  );
}

export function MapPin({
  highlighted = false,
  label,
  onClick,
}: {
  highlighted?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="block cursor-pointer border-0 bg-transparent p-0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={highlighted ? 34 : 28}
        height={highlighted ? 48 : 40}
        viewBox="0 0 28 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z"
          fill={highlighted ? "#2d8a7e" : "#1e3a5f"}
        />
        <circle cx="14" cy="14" r="7" fill="white" />
      </svg>
    </button>
  );
}
