import { useEffect, useMemo, useRef } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MapPin } from "lucide-react";
import type { StyleSpecification } from "maplibre-gl";

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const P1_REGION: [number, number] = [34.95, -80.78];

type PropertyPoint = {
  id: string;
  name: string;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function hasCoordinates(property: PropertyPoint) {
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);
  return (
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
  );
}

function applyOperationsPalette(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (layer.type === "background")
        return { ...layer, paint: { ...layer.paint, "background-color": "#f4f7f4" } };
      if (layer.id === "water" && layer.type === "fill")
        return { ...layer, paint: { ...layer.paint, "fill-color": "#cce7f4" } };
      if (layer.id === "waterway" && layer.type === "line")
        return { ...layer, paint: { ...layer.paint, "line-color": "#8eb4c4" } };
      if (layer.id.startsWith("boundary_") && layer.type === "line")
        return { ...layer, paint: { ...layer.paint, "line-color": "#b4c7cd" } };
      return layer;
    }),
  };
}

export function PropertyMap({
  properties,
  onOpen,
}: {
  properties: PropertyPoint[];
  onOpen: (property: PropertyPoint) => void;
}) {
  const map = useRef<MapRef>(null);
  const mappedProperties = useMemo(() => properties.filter(hasCoordinates), [properties]);
  const bounds = useMemo(() => {
    if (!mappedProperties.length) return null;
    const longitudes = mappedProperties.map((property) => Number(property.longitude));
    const latitudes = mappedProperties.map((property) => Number(property.latitude));
    return [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ] as [[number, number], [number, number]];
  }, [mappedProperties]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !bounds) return;
    instance.fitBounds(bounds, {
      padding: { top: 72, right: 72, bottom: 56, left: 72 },
      maxZoom: 15,
      duration: 0,
    });
  }, [bounds]);

  return (
    <div className="property-map" data-testid="property-map">
      <Map
        ref={map}
        workerUrl={workerUrl}
        initialViewState={{ latitude: P1_REGION[0], longitude: P1_REGION[1], zoom: 9 }}
        mapStyle={MAP_STYLE_URL}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        style={{ height: "100%", width: "100%" }}
        onLoad={({ target }) => {
          const original = target.getStyle();
          const styled = applyOperationsPalette(original);
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
      >
        <NavigationControl position="top-right" showCompass={false} />
        {mappedProperties.map((property) => (
          <Marker
            key={property.id}
            latitude={Number(property.latitude)}
            longitude={Number(property.longitude)}
            anchor="bottom"
          >
            <button
              className="property-map-pin"
              type="button"
              title={`Open ${property.name}`}
              aria-label={`Open ${property.name}, ${property.address}`}
              onClick={() => onOpen(property)}
            >
              <MapPin aria-hidden="true" size={31} strokeWidth={2.4} />
            </button>
          </Marker>
        ))}
      </Map>
      <div className="property-map-summary" aria-live="polite">
        <strong>
          {mappedProperties.length} mapped {mappedProperties.length === 1 ? "property" : "properties"}
        </strong>
        <span>Choose a pin to open its property profile.</span>
      </div>
    </div>
  );
}
