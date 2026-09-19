import { useEffect, useMemo, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MapPin } from "lucide-react";
import { propertyCoordinates } from "./property-coordinates";

// Match the public service-area map: muted streets and clear blue location pins.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const P1_REGION: [number, number] = [34.95, -80.78];

type PropertyPoint = {
  id: string;
  name: string;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function PropertyPin() {
  return (
    <svg viewBox="0 0 28 36" width="28" height="36" aria-hidden="true">
      <path
        d="M14 34S2 22 2 14a12 12 0 1 1 24 0c0 8-12 20-12 20Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="14" cy="14" r="4" fill="white" />
    </svg>
  );
}

export function PropertyMap({
  properties,
  onOpen,
  compact = false,
}: {
  properties: PropertyPoint[];
  compact?: boolean;
  onOpen: (property: PropertyPoint) => void;
}) {
  const map = useRef<MapRef>(null);
  const mappedProperties = useMemo(
    () =>
      properties.flatMap((property) => {
        const coordinates = propertyCoordinates(property);
        return coordinates ? [{ ...property, ...coordinates }] : [];
      }),
    [properties],
  );
  const bounds = useMemo(() => {
    if (!mappedProperties.length) return null;
    const longitudes = mappedProperties.map((property) => property.longitude);
    const latitudes = mappedProperties.map((property) => property.latitude);
    return [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ] as [[number, number], [number, number]];
  }, [mappedProperties]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    if (mappedProperties.length === 1) {
      instance.jumpTo({
        center: [mappedProperties[0].longitude, mappedProperties[0].latitude],
        zoom: 14,
      });
      return;
    }
    if (!bounds) return;
    instance.fitBounds(bounds, {
      padding: { top: 48, right: 48, bottom: 48, left: 48 },
      maxZoom: 15,
      duration: 0,
    });
  }, [bounds]);

  if (compact && !mappedProperties.length)
    return (
      <div
        className="client-property-map property-location-map--unavailable"
        role="status"
      >
        <MapPin aria-hidden="true" size={22} />
        <p>
          {properties.length
            ? "Map locations are not available for these properties yet. The property list remains below."
            : "Add a property to see its location here."}
        </p>
      </div>
    );

  return (
    <div
      className={`property-map${compact ? " client-property-map" : ""}`}
      data-testid="property-map"
    >
      <Map
        ref={map}
        workerUrl={workerUrl}
        initialViewState={{
          latitude: P1_REGION[0],
          longitude: P1_REGION[1],
          zoom: 9,
        }}
        mapStyle={MAP_STYLE_URL}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        style={{ height: "100%", width: "100%" }}
        onLoad={({ target }) => {
          if (mappedProperties.length === 1) {
            target.jumpTo({
              center: [
                mappedProperties[0].longitude,
                mappedProperties[0].latitude,
              ],
              zoom: 14,
            });
          } else if (bounds) {
            target.fitBounds(bounds, {
              padding: { top: 48, right: 48, bottom: 48, left: 48 },
              maxZoom: 15,
              duration: 0,
            });
          }
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {mappedProperties.map((property) => (
          <Marker
            key={property.id}
            latitude={property.latitude}
            longitude={property.longitude}
            anchor="bottom"
          >
            <button
              className="property-map-pin"
              type="button"
              title={`Open ${property.name}`}
              aria-label={`Open ${property.name}, ${property.address}`}
              onClick={() => onOpen(property)}
            >
              <PropertyPin />
            </button>
          </Marker>
        ))}
      </Map>
      <div
        className={
          compact ? "property-map-announcement" : "property-map-summary"
        }
        aria-live="polite"
      >
        <strong>
          {mappedProperties.length} mapped{" "}
          {mappedProperties.length === 1 ? "property" : "properties"}
        </strong>
        <span>
          Choose a pin to open its property profile.
          {mappedProperties.length < properties.length
            ? ` ${properties.length - mappedProperties.length} properties have no map location.`
            : ""}
        </span>
      </div>
    </div>
  );
}

export function PropertyLocationMap({ property }: { property: PropertyPoint }) {
  const coordinates = propertyCoordinates(property);
  if (!coordinates) {
    return (
      <div
        className="property-location-map property-location-map--unavailable"
        aria-label="Property map unavailable"
      >
        <MapPin aria-hidden="true" size={22} />
        <p>Map placement is not available for this property yet.</p>
      </div>
    );
  }
  const { latitude, longitude } = coordinates;
  return (
    <div className="property-location-map" data-testid="property-location-map">
      <Map
        workerUrl={workerUrl}
        key={property.id}
        initialViewState={{ latitude, longitude, zoom: 13.5 }}
        mapStyle={MAP_STYLE_URL}
        attributionControl={{ compact: true }}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        style={{ height: "100%", width: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker latitude={latitude} longitude={longitude} anchor="bottom">
          <span
            className="property-map-pin property-map-pin--static"
            aria-label={`${property.name} location`}
          >
            <PropertyPin />
          </span>
        </Marker>
      </Map>
    </div>
  );
}
