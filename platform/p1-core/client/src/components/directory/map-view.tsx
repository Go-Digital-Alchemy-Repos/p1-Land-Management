import { useMemo, useState, Fragment } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { BaseMap, MapPin } from "@/components/shared/base-map";
import { hasMapCoordinates } from "@/lib/map-style";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFirstSentence } from "@/lib/html";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { User } from "@shared/schema/users";

interface TherapistWithUser {
  profile: TherapistProfile;
  user: Pick<User, "firstName" | "lastName"> & { profileImageUrl?: string | null };
}

interface MapViewProps {
  therapists: TherapistWithUser[];
  height?: string;
  minHeight?: string;
  interactive?: boolean;
  collapseAttribution?: boolean;
  zoom?: number;
  fitToPins?: boolean;
  center?: [number, number];
  highlightedId?: string | null;
}

export function MapView({
  therapists,
  height = "500px",
  minHeight,
  interactive = true,
  collapseAttribution = false,
  zoom: zoomProp,
  fitToPins = false,
  center: centerProp,
  highlightedId,
}: MapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const markered = useMemo(
    () => therapists.filter((t) => hasMapCoordinates(t.profile.latitude, t.profile.longitude)),
    [therapists],
  );

  const center = useMemo<[number, number]>(() => {
    if (centerProp) return centerProp;
    if (markered.length === 0) return [20, 0];
    const avgLat =
      markered.reduce((sum, t) => sum + Number(t.profile.latitude), 0) / markered.length;
    const avgLng =
      markered.reduce((sum, t) => sum + Number(t.profile.longitude), 0) / markered.length;
    return [avgLat, avgLng];
  }, [markered, centerProp]);

  const zoom = zoomProp ?? (markered.length === 0 ? 2 : markered.length === 1 ? 6 : 3);

  const bounds = useMemo<[[number, number], [number, number]] | undefined>(() => {
    if (!fitToPins || markered.length === 0) return undefined;
    const latitudes = markered.map((t) => Number(t.profile.latitude));
    const longitudes = markered.map((t) => Number(t.profile.longitude));
    return [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ];
  }, [fitToPins, markered]);

  const hasPercentHeight = typeof height === "string" && height.includes("%");

  return (
    <div
      style={{ height, minHeight: minHeight ?? (hasPercentHeight ? "420px" : height) }}
      className="h-full w-full overflow-hidden border isolate"
      data-testid="map-container"
    >
      <BaseMap
        center={center}
        zoom={zoom}
        bounds={bounds}
        interactive={interactive}
        collapseAttribution={collapseAttribution}
      >
        {markered.map((t) => {
          const fullName =
            [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || "Verified Provider";
          const isHighlighted = highlightedId === t.profile.id;
          return (
            <Fragment key={t.profile.id}>
              <Marker
                latitude={Number(t.profile.latitude)}
                longitude={Number(t.profile.longitude)}
                anchor="bottom"
                style={{ zIndex: isHighlighted ? 1000 : 0 }}
              >
                <MapPin
                  highlighted={isHighlighted}
                  label={`View ${fullName}`}
                  onClick={() => setSelectedId(t.profile.id)}
                />
              </Marker>
              {selectedId === t.profile.id && (
                <Popup
                  latitude={Number(t.profile.latitude)}
                  longitude={Number(t.profile.longitude)}
                  anchor="bottom"
                  offset={40}
                  closeOnClick={false}
                  onClose={() => setSelectedId(null)}
                >
                  <div className="flex gap-2.5 max-w-[240px]" data-testid={`popup-${t.profile.id}`}>
                    <Avatar
                      className="h-10 w-10 shrink-0"
                      data-testid={`popup-avatar-${t.profile.id}`}
                    >
                      {t.user.profileImageUrl && (
                        <AvatarImage src={t.user.profileImageUrl} alt={fullName} />
                      )}
                      <AvatarFallback className="text-xs">
                        {`${(t.user.firstName || "")[0] || ""}${(t.user.lastName || "")[0] || ""}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className="font-semibold text-sm leading-tight"
                        data-testid={`popup-name-${t.profile.id}`}
                      >
                        {fullName}
                      </span>
                      {t.profile.title && (
                        <span className="text-xs text-gray-500 leading-tight">
                          {t.profile.title}
                        </span>
                      )}
                      {t.profile.bio && (
                        <span className="text-xs text-gray-600 leading-snug mt-0.5 line-clamp-2">
                          {getFirstSentence(t.profile.bio)}
                        </span>
                      )}
                      <Link
                        href={`/directory/${t.profile.id}`}
                        className="text-xs font-medium mt-1"
                        style={{ color: "#2d8a7e" }}
                        data-testid={`popup-link-${t.profile.id}`}
                      >
                        View Profile →
                      </Link>
                    </div>
                  </div>
                </Popup>
              )}
            </Fragment>
          );
        })}
      </BaseMap>
    </div>
  );
}
