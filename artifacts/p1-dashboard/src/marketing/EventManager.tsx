import {
  EventAdminTabs,
  EventAdminDetails,
} from "../../../../platform/p1-core/client/src/components/shared/event-admin-editor-presentation";
import {
  EventAdminCard,
  EventAdminFilters,
} from "../../../../platform/p1-core/client/src/components/shared/event-admin-list-presentation";
import { sidebarPrimitives as eventUi } from "./sidebar-primitives";
import { ImagePositionPicker } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/image-position-picker-workspace";
import { MediaLibrary } from "./MediaLibrary";
import { Pencil, Copy, Users, XCircle, Plus } from "lucide-react";
import { EventRegistrationSettings } from "./EventRegistrationSettings";
import { EventAttendees } from "./EventAttendees";
import { EventDirectoryManager } from "./EventDirectoryManager";
import { AddressAutocomplete } from "../AddressAutocomplete";
import { EventReferences } from "./EventReferences";
import { useEffect, useRef, useState } from "react";
import {
  listMarketingEvents,
  getMarketingEvent,
  createMarketingEvent,
  updateMarketingEvent,
  duplicateMarketingEvent,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingEvent,
  MarketingEventInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  MarketingEventInputEventType,
  MarketingEventInputCategory,
  MarketingEventInputAudience,
  MarketingEventInputFormat,
  MarketingEventInputDeliveryMode,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./event-manager.css";
const message = (error: unknown) =>
  (error as { data?: { message?: string; error?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Event request failed";
export function eventImageUrl(value?: string | null) {
  try {
    const url = new URL(value || "", "https://www.p1landmanagement.com");
    return value &&
      url.origin === "https://www.p1landmanagement.com" &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}
function eventSchedule(event: MarketingEvent) {
  const date = new Date(event.date);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const zone =
    event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    return `${date.toLocaleString(undefined, { timeZone: zone })} · ${zone}`;
  } catch {
    return `${date.toLocaleString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  }
}
function draft(event: MarketingEvent | "new"): MarketingEventInput {
  if (event === "new")
    return {
      title: "",
      date: "",
      status: "draft",
      visibility: "public",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      registrationEnabled: false,
    };
  const { id, createdAt, ...values } = event;
  return structuredClone(values);
}
function Editor({
  event,
  close,
  saved,
  canUseMedia,
}: {
  event: MarketingEvent | "new";
  close: () => void;
  saved: () => void;
  canUseMedia: boolean;
}) {
  const [value, setValue] = useState(() => draft(event)),
    [baseline] = useState(() => JSON.stringify(draft(event))),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [tab, setTab] = useState("details");
  const [attendeeBusy, setAttendeeBusy] = useState(false);
  const [tagsText, setTagsText] = useState((value.tags || []).join(", "));
  const [media, setMedia] = useState<"imageUrl" | "speakerImageUrl" | null>(
    null,
  );
  const mediaDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (media) mediaDialog.current?.showModal();
    else mediaDialog.current?.close();
  }, [media]);
  const dirty = JSON.stringify(value) !== baseline;
  useCmsUnsavedChanges(dirty || busy || attendeeBusy);
  const patch = (change: Partial<MarketingEventInput>) => {
    if (!gate.current) setValue((old) => ({ ...old, ...change }));
  };
  async function save() {
    if (gate.current || attendeeBusy) return;
    if (
      !value.title.trim() ||
      !value.date ||
      Number.isNaN(Date.parse(value.date))
    ) {
      setError("A title and valid start date are required.");
      return;
    }
    if (value.endDate && Date.parse(value.endDate) < Date.parse(value.date)) {
      setError("End date must not precede start date.");
      return;
    }
    if (
      value.status === "published" &&
      !window.confirm(
        "Save this published event? Its details will be visible according to its audience settings.",
      )
    )
      return;
    if (
      event !== "new" &&
      event.status === "published" &&
      value.status !== "published" &&
      !window.confirm(
        "Remove this event from published listings? Existing registrations will remain saved.",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      if (event === "new") await createMarketingEvent(value);
      else await updateMarketingEvent(event.id, value);
      if (alive.current) saved();
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const selects: [keyof MarketingEventInput, string, Record<string, string>][] =
    [
      ["eventType", "Event type", MarketingEventInputEventType],
      ["category", "Category", MarketingEventInputCategory],
      ["audience", "Audience", MarketingEventInputAudience],
      ["format", "Format", MarketingEventInputFormat],
      ["deliveryMode", "Delivery mode", MarketingEventInputDeliveryMode],
    ];
  function imageField(key: "imageUrl" | "speakerImageUrl", label: string) {
    return (
      <div className="space-y-2">
        <label>
          {label}
          <input
            type="text"
            value={value[key] || ""}
            onChange={(e) => patch({ [key]: e.target.value || null })}
          />
        </label>
        {eventImageUrl(value[key]) && (
          <img
            className="event-editor-image"
            src={eventImageUrl(value[key])}
            alt={label}
          />
        )}
        {canUseMedia && (
          <button type="button" disabled={busy} onClick={() => setMedia(key)}>
            Choose {label.toLowerCase()}
          </button>
        )}
      </div>
    );
  }
  const { Tabs, TabsContent, Card, CardHeader, CardTitle, CardContent } =
    eventUi;
  return (
    <section
      className="event-editor event-admin-presentation"
      aria-label="Website event editor"
    >
      <h1>{event === "new" ? "Create Event" : `Edit ${event.title}`}</h1>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy} className="event-workspace-fields">
          <Tabs
            value={tab}
            onValueChange={(next: string) => {
              if (!attendeeBusy) setTab(next);
            }}
          >
            <EventAdminTabs ui={eventUi} />
            <TabsContent value="details">
              <EventAdminDetails
                ui={eventUi}
                basic={
                  <>
                    {" "}
                    <label>
                      Title
                      <input
                        required
                        value={value.title}
                        onChange={(event) =>
                          patch({ title: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Slug
                      <input
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        value={value.slug || ""}
                        onChange={(event) =>
                          patch({ slug: event.target.value })
                        }
                      />
                    </label>
                    <p>
                      Leave the slug blank for a new event to generate it from
                      the title.
                    </p>
                    <CmsRichTextEditor
                      label="Event description"
                      value={value.description || ""}
                      onChange={(description) => patch({ description })}
                      disabled={busy}
                      canUseMedia={canUseMedia}
                    />
                    <label>
                      Status
                      <select
                        aria-label="Status"
                        value={value.status || ""}
                        disabled={
                          event !== "new" && event.status === "canceled"
                        }
                        onChange={(event) =>
                          patch({
                            status: event.target
                              .value as MarketingEventInput["status"],
                          })
                        }
                      >
                        {!value.status && <option value="">Not set</option>}
                        {[
                          "draft",
                          "published",
                          "completed",
                          "archived",
                          ...(value.status === "canceled" ? ["canceled"] : []),
                        ].map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                    {value.status === "canceled" && (
                      <p>
                        This event is canceled. Editing its details does not
                        reactivate registrations.
                      </p>
                    )}
                    <label>
                      Visibility
                      <select
                        aria-label="Visibility"
                        value={value.visibility || ""}
                        onChange={(event) =>
                          patch({ visibility: event.target.value || null })
                        }
                      >
                        <option value="">Not set</option>
                        {[
                          "public",
                          "members_only",
                          "counselors_only",
                          "admins_only",
                        ].map((option) => (
                          <option key={option} value={option}>
                            {option.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="event-check">
                      <input
                        type="checkbox"
                        checked={!!value.memberOnly}
                        onChange={(event) =>
                          patch({ memberOnly: event.target.checked })
                        }
                      />
                      Website membership restriction
                    </label>
                    <p>
                      Website audience rules are separate from dashboard staff
                      permissions.
                    </p>
                    {imageField("imageUrl", "Event Image")}
                    {eventImageUrl(value.imageUrl) && (
                      <ImagePositionPicker
                        components={eventUi as any}
                        imageUrl={eventImageUrl(value.imageUrl)!}
                        positionX={value.imagePositionX ?? 50}
                        positionY={value.imagePositionY ?? 50}
                        onPositionChange={(x, y) =>
                          patch({ imagePositionX: x, imagePositionY: y })
                        }
                      />
                    )}
                    {selects.map(([key, label, options]) => (
                      <label key={key}>
                        {label}
                        <select
                          aria-label={label}
                          value={String(value[key] || "")}
                          onChange={(event) =>
                            patch({ [key]: event.target.value || null })
                          }
                        >
                          <option value="">Not set</option>
                          {Object.values(options).map((option) => (
                            <option key={option} value={option}>
                              {option.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <label>
                      Tags
                      <input
                        value={tagsText}
                        onChange={(e) => {
                          if (gate.current) return;
                          setTagsText(e.target.value);
                          patch({
                            tags: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          });
                        }}
                      />
                    </label>
                    <p>Separate tags with commas.</p>
                  </>
                }
                schedule={
                  <>
                    {" "}
                    <p>
                      Enter dates in your device time zone:{" "}
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}. The
                      event time zone controls its published schedule context.
                    </p>
                    {(
                      [
                        ["date", "Start date"],
                        ["endDate", "End date"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="datetime-local"
                          step="1"
                          aria-label={label}
                          required={key === "date"}
                          value={localDate(value[key])}
                          onChange={(event) =>
                            patch({
                              [key]: event.target.value
                                ? new Date(event.target.value).toISOString()
                                : key === "date"
                                  ? ""
                                  : null,
                            })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Event time zone
                      <input
                        value={value.timezone || ""}
                        onChange={(event) =>
                          patch({ timezone: event.target.value || null })
                        }
                      />
                    </label>
                  </>
                }
                structured={
                  <p>
                    Structured data uses the saved title, description, dates and
                    location. Review these fields before publishing.
                  </p>
                }
                location={
                  <>
                    <EventReferences value={value} patch={patch} kind="venue" />{" "}
                    {(
                      [
                        ["location", "Location summary"],
                        ["locationName", "Location name"],
                        ["locationAddress", "Location address"],
                      ] as const
                    ).map(([key, label]) => key === "locationAddress" ? (
                      <AddressAutocomplete key={key} label={label} value={value.locationAddress || ""}
                        onValueChange={(next) => patch({ locationAddress: next || null })} />
                    ) : (
                      <label key={key}>
                        {label}
                        <input
                          value={value[key] || ""}
                          onChange={(event) =>
                            patch({ [key]: event.target.value || null })
                          }
                        />
                      </label>
                    ))}
                    <label className="event-check">
                      <input
                        type="checkbox"
                        checked={!!value.isVirtual}
                        onChange={(event) =>
                          patch({ isVirtual: event.target.checked })
                        }
                      />
                      Virtual event
                    </label>
                    <label>
                      Virtual join URL
                      <input
                        type="url"
                        value={value.virtualJoinUrl || ""}
                        onChange={(event) =>
                          patch({ virtualJoinUrl: event.target.value || null })
                        }
                      />
                    </label>
                    <label>
                      Dial-in information
                      <textarea
                        aria-label="Dial-in information"
                        value={value.virtualDialInInfo || ""}
                        onChange={(event) =>
                          patch({
                            virtualDialInInfo: event.target.value || null,
                          })
                        }
                      />
                    </label>
                    <label>
                      Latitude
                      <input
                        value={value.latitude || ""}
                        onChange={(e) =>
                          patch({ latitude: e.target.value || null })
                        }
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        value={value.longitude || ""}
                        onChange={(e) =>
                          patch({ longitude: e.target.value || null })
                        }
                      />
                    </label>
                    <label>
                      Zoom / Meeting Link
                      <input
                        type="url"
                        value={value.zoomLink || ""}
                        onChange={(e) =>
                          patch({ zoomLink: e.target.value || null })
                        }
                      />
                    </label>
                  </>
                }
                speaker={
                  <>
                    <EventReferences
                      value={value}
                      patch={patch}
                      kind="organizer"
                    />
                    <label>
                      Speaker Name
                      <input
                        value={value.speakerName || ""}
                        onChange={(e) =>
                          patch({ speakerName: e.target.value || null })
                        }
                      />
                    </label>
                    <label>
                      Speaker Bio
                      <textarea
                        value={value.speakerBio || ""}
                        onChange={(e) =>
                          patch({ speakerBio: e.target.value || null })
                        }
                      />
                    </label>
                    {imageField("speakerImageUrl", "Speaker Image")}
                  </>
                }
              />
            </TabsContent>
            <TabsContent value="registrations">
              <Card>
                <CardHeader>
                  <CardTitle>Registration Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <EventRegistrationSettings
                    value={value}
                    patch={patch}
                    disabled={busy}
                  />
                  {event === "new" ? (
                    <p>Save this event before viewing registrants.</p>
                  ) : (
                    <EventAttendees
                      embedded
                      onBusyChange={setAttendeeBusy}
                      eventId={event.id}
                      title={event.title}
                      close={() => {}}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="video-archive">
              <Card>
                <CardHeader>
                  <CardTitle>Video Archive</CardTitle>
                </CardHeader>
                <CardContent>
                  <label>
                    Recording URL
                    <input
                      type="url"
                      value={value.recordingUrl || ""}
                      onChange={(e) =>
                        patch({ recordingUrl: e.target.value || null })
                      }
                    />
                  </label>
                  <p>
                    Existing archive visibility, access and pricing settings are
                    preserved. Payment and entitlement controls are not
                    available in this dashboard.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="recurring">
              <Card>
                <CardHeader>
                  <CardTitle>Recurring Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    {value.isRecurring
                      ? `Saved recurrence: ${value.recurrencePattern || "Not specified"}`
                      : "This event is not recurring."}
                  </p>
                  <p>
                    Recurrence generation is not available in this dashboard.
                    Existing recurrence settings are preserved when saving.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </fieldset>{" "}
        <div className="event-actions">
          <button disabled={busy || attendeeBusy} type="submit">
            {busy ? "Saving…" : "Save event"}
          </button>
          <button
            disabled={busy || attendeeBusy}
            type="button"
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved event changes?")
              )
                close();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      <dialog
        ref={mediaDialog}
        aria-label="Choose event image"
        onCancel={() => setMedia(null)}
      >
        <button type="button" onClick={() => setMedia(null)}>
          Close image picker
        </button>
        {media && canUseMedia && !busy && (
          <MediaLibrary
            acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
            onSelect={(asset) => {
              patch({ [media]: asset.url });
              setMedia(null);
            }}
          />
        )}
      </dialog>
    </section>
  );
}
function EventDetail({
  id,
  close,
  saved,
  canUseMedia,
}: {
  id: string;
  close: () => void;
  saved: () => void;
  canUseMedia: boolean;
}) {
  const [event, setEvent] = useState<MarketingEvent | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setEvent(null);
    void getMarketingEvent(id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setEvent(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [id, attempt]);
  if (event)
    return (
      <Editor
        event={event}
        close={close}
        saved={saved}
        canUseMedia={canUseMedia}
      />
    );
  return (
    <section>
      {error ? (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setAttempt((value) => value + 1)}>
            Retry event
          </button>
        </p>
      ) : (
        <p role="status">Loading event…</p>
      )}
      <button onClick={close}>Back to events</button>
    </section>
  );
}
export default function EventManager({
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
}) {
  const [attendees, setAttendees] = useState<MarketingEvent | null>(null);
  const [directory, setDirectory] = useState<"venue" | "organizer" | null>(
    null,
  );
  const [rows, setRows] = useState<MarketingEvent[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [attempt, setAttempt] = useState(0),
    [query, setQuery] = useState(""),
    [typeFilter, setTypeFilter] = useState("all"),
    [categoryFilter, setCategoryFilter] = useState("all"),
    [deliveryFilter, setDeliveryFilter] = useState("all"),
    [status, setStatus] = useState("all"),
    [duplicating, setDuplicating] = useState(false);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void listMarketingEvents({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const saved = () => {
    setSelected(null);
    setNotice("Event saved.");
    setAttempt((value) => value + 1);
  };
  async function duplicate(event: MarketingEvent) {
    if (
      gate.current ||
      !window.confirm(
        `Create a draft copy of ${event.title}? Review the copied date and settings before publishing.`,
      )
    )
      return;
    gate.current = true;
    setDuplicating(true);
    setError("");
    try {
      const copy = await duplicateMarketingEvent(event.id);
      if (alive.current) {
        setSelected(copy.id);
        setAttempt((value) => value + 1);
        setNotice("Draft copy created.");
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setDuplicating(false);
    }
  }
  async function cancelEvent(event: MarketingEvent) {
    if (
      gate.current ||
      !window.confirm(
        `Cancel ${event.title}? Confirmed, waitlisted and pending registrations will be canceled, and cancellation emails will be attempted. Payment records remain unchanged; this does not issue refunds.`,
      )
    )
      return;
    gate.current = true;
    setDuplicating(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateMarketingEvent(event.id, {
        status: "canceled",
      });
      if (alive.current) {
        setRows((current) =>
          current.map((row) => (row.id === updated.id ? updated : row)),
        );
        setNotice(
          "Event and active registrations canceled. Cancellation email delivery is not guaranteed; review any outstanding payments separately.",
        );
      }
    } catch (error) {
      if (alive.current)
        setError(
          `${message(error)}. Refresh events to verify the saved status before retrying.`,
        );
    } finally {
      gate.current = false;
      if (alive.current) setDuplicating(false);
    }
  }
  if (attendees)
    return (
      <EventAttendees
        key={attendees.id}
        eventId={attendees.id}
        title={attendees.title}
        close={() => setAttendees(null)}
      />
    );
  if (directory)
    return (
      <EventDirectoryManager
        key={directory}
        kind={directory}
        close={() => setDirectory(null)}
        canUseMedia={canUseMedia}
      />
    );
  if (selected === "new")
    return (
      <Editor
        event="new"
        close={() => setSelected(null)}
        saved={saved}
        canUseMedia={canUseMedia}
      />
    );
  if (selected)
    return (
      <EventDetail
        key={selected}
        id={selected}
        close={() => setSelected(null)}
        saved={saved}
        canUseMedia={canUseMedia}
      />
    );
  const visible = rows.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      (typeFilter === "all" || row.eventType === typeFilter) &&
      (categoryFilter === "all" || row.category === categoryFilter) &&
      (deliveryFilter === "all" || row.deliveryMode === deliveryFilter) &&
      `${row.title} ${row.slug} ${row.locationName || ""} ${row.speakerName || ""} ${(row.tags || []).join(" ")} ${row.description || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section
      className="event-manager event-admin-presentation"
      aria-label="Website events"
    >
      <h1>Events</h1>
      <p>Manage website event details and publication.</p>
      <div className="event-actions">
        <button disabled={duplicating} onClick={() => setDirectory("venue")}>
          Manage venues
        </button>
        <button
          disabled={duplicating}
          onClick={() => setDirectory("organizer")}
        >
          Manage organizers
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className="event-actions">
        <button
          disabled={busy || duplicating}
          onClick={() => setSelected("new")}
        >
          Create event
        </button>
        <button
          disabled={busy || duplicating}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Refresh events
        </button>
      </div>
      <EventAdminFilters
        ui={eventUi}
        searchTerm={query}
        setSearchTerm={setQuery}
        eventTypeFilter={typeFilter}
        setEventTypeFilter={setTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={status}
        setStatusFilter={setStatus}
        deliveryModeFilter={deliveryFilter}
        setDeliveryModeFilter={setDeliveryFilter}
        hasActiveEventFilters={
          !!query ||
          [typeFilter, categoryFilter, status, deliveryFilter].some(
            (x) => x !== "all",
          )
        }
        clearEventFilters={() => {
          setQuery("");
          setTypeFilter("all");
          setCategoryFilter("all");
          setStatus("all");
          setDeliveryFilter("all");
        }}
        visibleCount={visible.length}
        totalCount={rows.length}
        options={{
          EVENT_TYPES: Object.values(MarketingEventInputEventType),
          EVENT_TYPE_LABELS: MarketingEventInputEventType,
          EVENT_CATEGORIES: Object.values(MarketingEventInputCategory),
          EVENT_CATEGORY_LABELS: MarketingEventInputCategory,
          EVENT_STATUSES: [
            "draft",
            "published",
            "completed",
            "archived",
            "canceled",
          ],
          EVENT_DELIVERY_MODES: Object.values(MarketingEventInputDeliveryMode),
          EVENT_DELIVERY_MODE_LABELS: MarketingEventInputDeliveryMode,
        }}
      />
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading events…</p>}
      {!busy && (
        <div className="space-y-4">
          {visible.map((event) => (
            <EventAdminCard
              key={event.id}
              ui={eventUi}
              event={{ ...event, imageUrl: eventImageUrl(event.imageUrl) }}
              onEdit={() => {
                if (!duplicating) setSelected(event.id);
              }}
              schedule={eventSchedule(event)}
              imageStyle={{
                objectPosition: `${event.imagePositionX ?? 50}% ${event.imagePositionY ?? 50}%`,
              }}
              description={(event.description || "").replace(/<[^>]*>/g, "")}
              typeLabel={event.eventType?.replaceAll("_", " ")}
              categoryLabel={event.category?.replaceAll("_", " ")}
              visibility={(event.visibility || "Not set").replaceAll("_", " ")}
              statusStyle={event.status === "published" ? "default" : "outline"}
              actions={
                <>
                  {" "}
                  <div className="event-actions">
                    <button
                      disabled={duplicating}
                      onClick={() => setSelected(event.id)}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                      <span className="sr-only">Edit {event.title}</span>
                    </button>
                    <button
                      disabled={duplicating}
                      onClick={() => setAttendees(event)}
                    >
                      <Users className="h-4 w-4 text-violet-600" />
                      <span className="sr-only">
                        Attendees for {event.title}
                      </span>
                    </button>
                    <button
                      disabled={duplicating}
                      onClick={() => void duplicate(event)}
                    >
                      <Copy className="h-4 w-4 text-amber-600" />
                      <span className="sr-only">Duplicate {event.title}</span>
                    </button>
                    {event.status !== "canceled" && (
                      <button
                        disabled={duplicating}
                        onClick={() => void cancelEvent(event)}
                      >
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span className="sr-only">Cancel {event.title}</span>
                      </button>
                    )}
                  </div>
                </>
              }
            />
          ))}
          {!error && !visible.length && <p>No matching events.</p>}
        </div>
      )}
    </section>
  );
}
