import { useEffect, useState } from "react";
import {
  listMarketingEventVenues,
  listMarketingEventOrganizers,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingEventInput,
  MarketingEventVenue,
  MarketingEventOrganizer,
} from "../../../../lib/api-client-react/src/dashboard/models";
export function EventReferences({
  value,
  patch,
}: {
  value: MarketingEventInput;
  patch: (change: Partial<MarketingEventInput>) => void;
}) {
  const [venues, setVenues] = useState<MarketingEventVenue[]>([]),
    [organizers, setOrganizers] = useState<MarketingEventOrganizer[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void Promise.all([
      listMarketingEventVenues({ signal: controller.signal }),
      listMarketingEventOrganizers({ signal: controller.signal }),
    ])
      .then(([venues, organizers]) => {
        if (!controller.signal.aborted) {
          setVenues(venues);
          setOrganizers(organizers);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Venue and organizer choices could not be loaded. Saved links are unchanged.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const venue = venues.find((row) => row.id === value.venueId),
    organizer = organizers.find((row) => row.id === value.organizerId);
  return (
    <div className="event-editor">
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry shared records
          </button>
        </p>
      )}
      {busy && <p role="status">Loading venue and organizer choices…</p>}
      <label>
        Shared venue
        <select
          aria-label="Shared venue"
          disabled={busy || !!error}
          value={value.venueId || ""}
          onChange={(event) => patch({ venueId: event.target.value || null })}
        >
          <option value="">None</option>
          {value.venueId && !venue && (
            <option value={value.venueId}>Saved venue (unavailable)</option>
          )}
          {venues.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {venue && !busy && !error && (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Replace this event’s location details with the selected venue?",
              )
            )
              patch({
                locationName: venue.name,
                locationAddress: [
                  venue.address,
                  venue.city,
                  venue.region,
                  venue.postalCode,
                  venue.country,
                ]
                  .filter(Boolean)
                  .join(", "),
                location: venue.isVirtual ? "Virtual" : venue.name,
                latitude: venue.latitude,
                longitude: venue.longitude,
                isVirtual: !!venue.isVirtual,
                deliveryMode: venue.isVirtual
                  ? "virtual"
                  : value.deliveryMode === "virtual"
                    ? "in_person"
                    : value.deliveryMode,
              });
          }}
        >
          Use venue details
        </button>
      )}
      <label>
        Shared organizer
        <select
          aria-label="Shared organizer"
          disabled={busy || !!error}
          value={value.organizerId || ""}
          onChange={(event) =>
            patch({ organizerId: event.target.value || null })
          }
        >
          <option value="">None</option>
          {value.organizerId && !organizer && (
            <option value={value.organizerId}>
              Saved organizer (unavailable)
            </option>
          )}
          {organizers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      {organizer && !busy && !error && (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Replace this event’s speaker details with the selected organizer?",
              )
            )
              patch({
                speakerName: organizer.name,
                speakerBio: organizer.description,
                speakerImageUrl: organizer.imageUrl,
              });
          }}
        >
          Use organizer details
        </button>
      )}
      <p>
        Selecting a shared record changes its link only. Use its details to
        replace the event-specific location or speaker information.
      </p>
    </div>
  );
}
