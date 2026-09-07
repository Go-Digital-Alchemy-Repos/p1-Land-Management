import { useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { BaseMap, MapPin } from "@/components/shared/base-map";
import { hasMapCoordinates } from "@/lib/map-style";

interface EventLocationMapProps {
  latitude?: string | null;
  longitude?: string | null;
  locationName?: string;
  address?: string | null;
  className?: string;
}

export function EventLocationMap({
  latitude,
  longitude,
  locationName,
  address,
  className,
}: EventLocationMapProps) {
  const [popupOpen, setPopupOpen] = useState(false);
  const lat = latitude ? parseFloat(latitude) : NaN;
  const lng = longitude ? parseFloat(longitude) : NaN;
  const mapClassName = className ?? "aspect-video max-h-[300px] rounded-xl overflow-hidden border";

  if (!hasMapCoordinates(latitude, longitude)) {
    const query = address || locationName;
    if (!query) return null;

    return (
      <div className={mapClassName} data-testid="map-event-location">
        <iframe
          title={locationName ? `Map for ${locationName}` : "Event location map"}
          src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  return (
    <div className={mapClassName} data-testid="map-event-location">
      <BaseMap center={[lat, lng]} zoom={14} interactive={false}>
        <Marker latitude={lat} longitude={lng} anchor="bottom">
          <MapPin label={locationName || "Event location"} onClick={() => setPopupOpen(true)} />
        </Marker>
        {popupOpen && locationName && (
          <Popup
            latitude={lat}
            longitude={lng}
            anchor="bottom"
            offset={40}
            closeOnClick={false}
            onClose={() => setPopupOpen(false)}
          >
            <span className="text-sm font-medium">{locationName}</span>
          </Popup>
        )}
      </BaseMap>
    </div>
  );
}
