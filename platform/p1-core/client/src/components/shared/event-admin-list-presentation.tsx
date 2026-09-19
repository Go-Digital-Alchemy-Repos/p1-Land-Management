import type { CSSProperties, ReactNode } from "react";
import { CalendarDays, MapPin, Repeat, Video, Search, X } from "lucide-react";
import type { EventAdminPrimitives } from "./event-admin-editor-presentation";
export type EventCardRecord = {
  id: string;
  title: string;
  date: unknown;
  imageUrl?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  visibility?: string | null;
  eventType?: string | null;
  category?: string | null;
  registrationApprovalMode?: string | null;
  isVirtual?: boolean | null;
  memberOnly?: boolean | null;
  isRecurring?: boolean | null;
  showInArchives?: boolean | null;
};
export function EventAdminCard({
  ui,
  event,
  onEdit,
  actions,
  capacity,
  schedule,
  imageStyle,
  typeLabel,
  categoryLabel,
  description,
  statusStyle,
  visibility,
}: {
  ui: EventAdminPrimitives;
  event: EventCardRecord;
  onEdit: () => void;
  actions: ReactNode;
  capacity?: ReactNode;
  schedule: ReactNode;
  imageStyle?: CSSProperties;
  typeLabel?: string;
  categoryLabel?: string;
  description?: string;
  statusStyle?: string;
  visibility: string;
}) {
  const { Card, CardHeader, CardTitle, CardContent, Badge } = ui;
  return (
    <Card
      data-testid={`card-event-${event.id}`}
      className="cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
      onClick={() => onEdit()}
    >
      <div className={event.imageUrl ? "flex flex-col sm:flex-row" : ""}>
        {event.imageUrl && (
          <div
            className="sm:w-32 sm:min-w-[8rem] shrink-0"
            data-testid={`img-event-thumbnail-${event.id}`}
          >
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-32 sm:h-full w-full object-cover"
              style={imageStyle}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle
                className="text-lg flex items-center gap-2"
                data-testid={`text-event-title-${event.id}`}
              >
                {event.title}
                {capacity}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {event.date ? schedule : "—"}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          </CardHeader>
          <CardContent>
            {event.description && (
              <p
                className="text-sm text-muted-foreground mb-2 line-clamp-2"
                data-testid={`text-event-desc-${event.id}`}
              >
                {description}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={statusStyle} data-testid={`badge-status-${event.id}`}>
                {(event.status ?? "published").charAt(0).toUpperCase() +
                  (event.status ?? "published").slice(1)}
              </Badge>
              <Badge variant="outline" data-testid={`badge-visibility-${event.id}`}>
                {visibility}
              </Badge>
              {event.eventType && (
                <Badge variant="secondary" data-testid={`badge-event-type-${event.id}`}>
                  {typeLabel}
                </Badge>
              )}
              {event.category && (
                <Badge variant="outline" data-testid={`badge-event-category-${event.id}`}>
                  {categoryLabel}
                </Badge>
              )}
              {event.registrationApprovalMode === "manual" && (
                <Badge variant="outline" data-testid={`badge-manual-approval-${event.id}`}>
                  Manual Approval
                </Badge>
              )}
              {event.isVirtual && (
                <Badge variant="secondary" data-testid={`badge-virtual-${event.id}`}>
                  Virtual
                </Badge>
              )}
              {event.memberOnly && (
                <Badge variant="secondary" data-testid={`badge-member-only-${event.id}`}>
                  Members Only
                </Badge>
              )}
              {event.isRecurring && (
                <Badge variant="secondary" data-testid={`badge-recurring-${event.id}`}>
                  <Repeat className="h-3 w-3 mr-1" />
                  Recurring
                </Badge>
              )}
              {event.showInArchives && (
                <Badge variant="secondary" data-testid={`badge-archived-${event.id}`}>
                  <Video className="h-3 w-3 mr-1" />
                  In Archives
                </Badge>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export function EventAdminFilters({
  ui,
  searchTerm,
  setSearchTerm,
  eventTypeFilter,
  setEventTypeFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  deliveryModeFilter,
  setDeliveryModeFilter,
  hasActiveEventFilters,
  clearEventFilters,
  visibleCount,
  totalCount,
  options,
}: {
  ui: EventAdminPrimitives;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  eventTypeFilter: string;
  setEventTypeFilter: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  deliveryModeFilter: string;
  setDeliveryModeFilter: (s: string) => void;
  hasActiveEventFilters: boolean;
  clearEventFilters: () => void;
  visibleCount: number;
  totalCount: number;
  options: {
    EVENT_TYPES: string[];
    EVENT_TYPE_LABELS: Record<string, string>;
    EVENT_CATEGORIES: string[];
    EVENT_CATEGORY_LABELS: Record<string, string>;
    EVENT_STATUSES: string[];
    EVENT_DELIVERY_MODES: string[];
    EVENT_DELIVERY_MODE_LABELS: Record<string, string>;
  };
}) {
  const { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } = ui;
  const {
    EVENT_TYPES,
    EVENT_TYPE_LABELS,
    EVENT_CATEGORIES,
    EVENT_CATEGORY_LABELS,
    EVENT_STATUSES,
    EVENT_DELIVERY_MODES,
    EVENT_DELIVERY_MODE_LABELS,
  } = options;
  const eventStatusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <div
      className="mb-4 rounded-lg border bg-card p-4 shadow-sm"
      data-testid="admin-events-filter-toolbar"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(140px,auto))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(event.target.value)
            }
            aria-label="Search events"
            placeholder="Search events"
            className="pl-9"
            data-testid="input-admin-event-search"
          />
        </div>
        <Select aria-label="Filter type" value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger data-testid="select-admin-event-type-filter">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EVENT_TYPES.map((eventType) => (
              <SelectItem key={eventType} value={eventType}>
                {EVENT_TYPE_LABELS[eventType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          aria-label="Filter category"
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger data-testid="select-admin-event-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EVENT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {EVENT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select aria-label="Filter status" value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="select-admin-event-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {EVENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {eventStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          aria-label="Filter delivery"
          value={deliveryModeFilter}
          onValueChange={setDeliveryModeFilter}
        >
          <SelectTrigger data-testid="select-admin-event-delivery-filter">
            <SelectValue placeholder="Delivery" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Delivery Modes</SelectItem>
            {EVENT_DELIVERY_MODES.map((deliveryMode) => (
              <SelectItem key={deliveryMode} value={deliveryMode}>
                {EVENT_DELIVERY_MODE_LABELS[deliveryMode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveEventFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={clearEventFilters}
            data-testid="button-clear-admin-event-filters"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground" data-testid="text-admin-event-count">
        Showing {visibleCount} of {totalCount} events
      </p>
    </div>
  );
}
