import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import type { Event } from "@shared/schema/events";
import { EVENT_CATEGORY_LABELS, EVENT_TYPE_LABELS } from "@shared/schema/events";
import { getEventPath, getEventUrlSegment } from "@shared/event-url";
import type { EventRegistration } from "@shared/schema/event-registrations";
import type { CmsForm, SeoSettings } from "@shared/schema";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EventLocationMap } from "@/components/shared/event-location-map";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn, STALE_TIMES } from "@/lib/queryClient";
import { useState, useEffect, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { SiApple, SiGooglemaps, SiOpenstreetmap, SiWaze } from "react-icons/si";
import { TbBrandBing } from "react-icons/tb";
import { useSeo } from "@/hooks/use-seo";
import { JsonLd } from "@/components/shared/json-ld";
import { formatEventDate, formatEventTime } from "@/lib/event-datetime";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { stripHtml } from "@/lib/html";
import { useFrontendEditTarget } from "@/features/frontend-edit/frontend-edit";
import {
  buildOrganizationLd,
  buildBreadcrumbLd,
  buildEventLd,
  buildVideoObjectLd,
} from "@/lib/structured-data";
import {
  CalendarDays,
  Clock,
  MapPin,
  Monitor,
  ArrowLeft,
  ExternalLink,
  Lock,
  Phone,
  Video,
  Users,
  Ticket,
  Globe,
  User,
  AlertTriangle,
  Building2,
  Wifi,
  CheckCircle2,
  XCircle,
  ClockIcon,
  Loader2,
  LogIn,
  ChevronDown,
  Navigation,
} from "lucide-react";

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function getRegistrationState(event: Event): "open" | "closed" | "upcoming" | "none" {
  if (!event.registrationEnabled) return "none";
  const now = new Date();
  if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) return "upcoming";
  if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) return "closed";
  return "open";
}

function canUserAccessEvent(event: Event, userRole: string | null): boolean {
  if (!event.visibility || event.visibility === "public") return true;
  if (!userRole) return false;
  if (userRole === "admin") return true;
  if (event.visibility === "members_only") return userRole === "therapist" || userRole === "client";
  if (event.visibility === "counselors_only") return userRole === "therapist";
  if (event.visibility === "admins_only") return false;
  return true;
}

type DirectionLink = {
  label: string;
  href: string;
  icon: IconType;
  color: string;
};

function getCoordinatePair(event: Event): { lat: number; lng: number } | null {
  if (!event.latitude || !event.longitude) return null;
  const lat = Number.parseFloat(event.latitude);
  const lng = Number.parseFloat(event.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getDirectionsQuery(event: Event, displayLocationName?: string | null): string | null {
  const address = event.locationAddress?.trim();
  if (address) return address;

  const namedLocation = (displayLocationName || event.location)?.trim();
  if (namedLocation) return namedLocation;

  const coords = getCoordinatePair(event);
  return coords ? `${coords.lat},${coords.lng}` : null;
}

function getDirectionsLinks(event: Event, displayLocationName?: string | null): DirectionLink[] {
  const query = getDirectionsQuery(event, displayLocationName);
  const coords = getCoordinatePair(event);
  if (!query && !coords) return [];

  const encodedQuery = encodeURIComponent(query ?? `${coords!.lat},${coords!.lng}`);
  const encodedBingQuery = encodeURIComponent(query ?? `${coords!.lat}, ${coords!.lng}`);
  const coordinateQuery = coords ? `${coords.lat},${coords.lng}` : null;

  return [
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`,
      icon: SiGooglemaps,
      color: "#4285F4",
    },
    {
      label: "Apple Maps",
      href: `https://maps.apple.com/?daddr=${encodedQuery}`,
      icon: SiApple,
      color: "#111827",
    },
    {
      label: "Waze",
      href: coordinateQuery
        ? `https://www.waze.com/ul?ll=${encodeURIComponent(coordinateQuery)}&navigate=yes`
        : `https://www.waze.com/ul?q=${encodedQuery}&navigate=yes`,
      icon: SiWaze,
      color: "#33CCFF",
    },
    {
      label: "Bing Maps",
      href: `https://www.bing.com/maps?where1=${encodedBingQuery}`,
      icon: TbBrandBing,
      color: "#008373",
    },
    {
      label: "OpenStreetMap",
      href: coordinateQuery
        ? `https://www.openstreetmap.org/directions?to=${encodeURIComponent(coordinateQuery)}`
        : `https://www.openstreetmap.org/search?query=${encodedQuery}`,
      icon: SiOpenstreetmap,
      color: "#7EBC6F",
    },
  ];
}

function EventDirectionsDropdown({
  event,
  displayLocationName,
}: {
  event: Event;
  displayLocationName?: string | null;
}) {
  const coords = getCoordinatePair(event);
  const hasPhysicalLocation = Boolean(
    event.deliveryMode === "in_person" ||
    event.deliveryMode === "hybrid" ||
    event.locationAddress ||
    coords ||
    (!event.isVirtual && (displayLocationName || event.location)),
  );
  const links = hasPhysicalLocation ? getDirectionsLinks(event, displayLocationName) : [];

  if (links.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-8 gap-1.5 px-2.5 text-xs sm:mt-0"
          data-testid="button-event-directions"
        >
          <Navigation className="h-3.5 w-3.5" />
          Get Directions
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {links.map((link) => {
          const DirectionIcon = link.icon;
          return (
            <DropdownMenuItem key={link.label} asChild>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Get directions with ${link.label}`}
                data-testid={`link-event-directions-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <DirectionIcon className="h-4 w-4" style={{ color: link.color }} />
                {link.label}
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-2/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function RegistrationSection({
  event,
  user,
  isPast,
  isCanceled,
  embedded = false,
}: {
  event: Event;
  user: { id: string; role: string; email: string; firstName: string } | null;
  isPast: boolean;
  isCanceled: boolean;
  embedded?: boolean;
}) {
  const { toast } = useToast();
  const registrationState = getRegistrationState(event);

  const { data: registration, isLoading: regLoading } = useQuery<EventRegistration | null>({
    queryKey: ["/api/events", event.id, "registration"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && event.registrationEnabled === true && !isPast && !isCanceled,
  });
  const { data: registrationForm } = useQuery<CmsForm>({
    queryKey: ["/api/events", event.id, "registration-form"],
    enabled:
      Boolean(event.registrationFormId) &&
      event.registrationEnabled === true &&
      !isPast &&
      !isCanceled,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/register`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "registration"] });
      toast({
        title: "Registered successfully",
        description: "You have been registered for this event.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/events/${event.id}/registration`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "registration"] });
      toast({
        title: "Registration canceled",
        description: "Your registration has been canceled.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Cancellation failed", description: error.message, variant: "destructive" });
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-event-checkout-session", {
        eventId: event.id,
      });
      const { url } = await res.json();
      return url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    },
  });

  if (!event.registrationEnabled) return null;
  if (isPast || isCanceled) return null;

  const isFree = event.registrationType === "free";
  const isPaid = event.registrationType === "paid";

  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestRegistered, setGuestRegistered] = useState(false);

  function renderShell(content: ReactNode, testId: string, className = "") {
    if (embedded) {
      return (
        <div className={className} data-testid={testId}>
          {content}
        </div>
      );
    }

    return (
      <Card className={className} data-testid={testId}>
        <CardContent className="p-5 sm:p-6">{content}</CardContent>
      </Card>
    );
  }

  const guestRegisterMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/register-guest`, {
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setGuestRegistered(true);
      const statusMsg =
        data.status === "waitlisted"
          ? "You've been added to the waitlist. We'll notify you if a spot opens up."
          : "You have been registered for this event. Check your email for confirmation.";
      toast({
        title: data.status === "waitlisted" ? "Added to waitlist" : "Registered successfully",
        description: statusMsg,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  if (!user) {
    if (registrationState === "upcoming") {
      return renderShell(
        <div className="flex items-center gap-3">
          <ClockIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-heading text-lg font-semibold">Registration Opens Soon</h3>
            {event.registrationOpensAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Registration opens on{" "}
                {formatEventDate(event.registrationOpensAt, event.timezone, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                at{" "}
                {formatEventTime(event.registrationOpensAt, event.timezone, {
                  timeZoneName: "short",
                })}
                .
              </p>
            )}
          </div>
        </div>,
        "card-registration-upcoming",
      );
    }

    if (registrationState === "closed") {
      return renderShell(
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-heading text-lg font-semibold">Registration Closed</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Registration for this event has closed.
            </p>
          </div>
        </div>,
        "card-registration-closed",
      );
    }

    if (guestRegistered) {
      return renderShell(
        <>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-heading text-lg font-semibold">You're Registered</h3>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-guest-success-message">
            A confirmation email has been sent to your email address.
          </p>
        </>,
        "card-guest-registration-success",
        embedded ? "" : "border-green-600/30",
      );
    }

    if (isPaid || event.registrationFormId || (event.visibility && event.visibility !== "public")) {
      return renderShell(
        <>
          <div className="flex items-center gap-3 mb-3">
            <LogIn className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {isPaid
              ? `This is a paid event (${formatCurrency(event.registrationFee || 0, event.registrationCurrency || "usd")}). Log in to register and pay.`
              : event.registrationFormId
                ? "Log in to complete the event registration form."
                : "Log in to your account to register for this event."}
          </p>
          <Link href="/login">
            <Button data-testid="button-login-to-register">
              <LogIn className="mr-2 h-4 w-4" />
              Log in to Register
            </Button>
          </Link>
        </>,
        "card-registration-login",
      );
    }

    return renderShell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <Ticket className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Fill in your details below to register for this free event.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            guestRegisterMutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="guest-first-name" className="text-sm">
                First Name
              </Label>
              <Input
                id="guest-first-name"
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                required
                data-testid="input-guest-first-name"
              />
            </div>
            <div>
              <Label htmlFor="guest-last-name" className="text-sm">
                Last Name
              </Label>
              <Input
                id="guest-last-name"
                value={guestLastName}
                onChange={(e) => setGuestLastName(e.target.value)}
                required
                data-testid="input-guest-last-name"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="guest-email" className="text-sm">
              Email
            </Label>
            <Input
              id="guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              required
              data-testid="input-guest-email"
            />
          </div>
          <Button
            type="submit"
            disabled={
              guestRegisterMutation.isPending || !guestFirstName || !guestLastName || !guestEmail
            }
            className="w-full"
            data-testid="button-guest-register"
          >
            {guestRegisterMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ticket className="mr-2 h-4 w-4" />
            )}
            Register
          </Button>
        </form>
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-accent hover:underline"
              data-testid="link-login-instead"
            >
              Log in
            </Link>
          </p>
        </div>
      </>,
      "card-guest-registration",
    );
  }

  if (
    registration &&
    registration.status === "confirmed" &&
    (registration.paymentStatus === "paid" || registration.paymentStatus === "not_required") &&
    registrationState !== "open"
  ) {
    return renderShell(
      <>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h3 className="font-heading text-lg font-semibold">You're Registered</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-2">You are confirmed for this event.</p>
      </>,
      "card-registration-confirmed-closed",
      embedded ? "" : "border-green-600/30",
    );
  }

  if (registrationState === "closed" && (!registration || registration.status === "canceled")) {
    return renderShell(
      <div className="flex items-center gap-3">
        <XCircle className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="font-heading text-lg font-semibold">Registration Closed</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Registration for this event has closed.
          </p>
        </div>
      </div>,
      "card-registration-closed",
    );
  }

  if (registrationState === "upcoming") {
    return renderShell(
      <div className="flex items-center gap-3">
        <ClockIcon className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="font-heading text-lg font-semibold">Registration Opens Soon</h3>
          {event.registrationOpensAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Registration opens on{" "}
              {formatEventDate(event.registrationOpensAt, event.timezone, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              at{" "}
              {formatEventTime(event.registrationOpensAt, event.timezone, {
                timeZoneName: "short",
              })}
              .
            </p>
          )}
        </div>
      </div>,
      "card-registration-upcoming",
    );
  }

  if (regLoading) {
    return renderShell(
      <>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking registration status...</p>
      </>,
      "card-registration-loading",
      "flex items-center gap-3",
    );
  }

  if (
    registration &&
    registration.status === "confirmed" &&
    (registration.paymentStatus === "paid" || registration.paymentStatus === "not_required")
  ) {
    return renderShell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <h3 className="font-heading text-lg font-semibold">You're Registered</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          You are confirmed for this event. We'll send event details and any updates to your email.
        </p>
        {isFree && (
          <Button
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            data-testid="button-cancel-registration"
          >
            {cancelMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Cancel Registration
          </Button>
        )}
      </>,
      "card-registration-confirmed",
      embedded ? "" : "border-green-600/30",
    );
  }

  if (isPaid && registration && registration.paymentStatus === "pending") {
    return renderShell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <ClockIcon className="h-5 w-5 text-yellow-600" />
          <h3 className="font-heading text-lg font-semibold">Payment Pending</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          You've started the registration process but haven't completed the payment yet.
        </p>
        <Button
          onClick={() => payMutation.mutate()}
          disabled={payMutation.isPending}
          data-testid="button-resume-checkout"
        >
          {payMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Ticket className="mr-2 h-4 w-4" />
          )}
          Resume Checkout
        </Button>
      </>,
      "card-registration-pending-payment",
      embedded ? "" : "border-yellow-600/30",
    );
  }

  if (registration && registration.status === "waitlisted") {
    return renderShell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <ClockIcon className="h-5 w-5 text-yellow-600" />
          <h3 className="font-heading text-lg font-semibold">You're on the Waitlist</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This event is at capacity. You'll be automatically confirmed if a spot opens up, and we'll
          notify you by email.
        </p>
        <Button
          variant="outline"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          data-testid="button-cancel-waitlist"
        >
          {cancelMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Leave Waitlist
        </Button>
      </>,
      "card-registration-waitlisted",
      embedded ? "" : "border-yellow-600/30",
    );
  }

  if (registration && registration.status === "pending") {
    return renderShell(
      <>
        <div className="flex items-center gap-3 mb-3">
          <ClockIcon className="h-5 w-5 text-yellow-600" />
          <h3 className="font-heading text-lg font-semibold">Registration Pending</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Your registration has been submitted and is waiting for approval.
        </p>
      </>,
      "card-registration-pending-approval",
      embedded ? "" : "border-yellow-600/30",
    );
  }

  if (isFree && registrationForm) {
    return renderShell(
      <>
        <div className="flex items-center gap-3 mb-4">
          <Ticket className="h-5 w-5 text-accent" />
          <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
        </div>
        <PublicFormRenderer
          slug={`event-${event.id}-registration`}
          formOverride={registrationForm}
          submitUrl={`/api/events/${event.id}/register`}
          buildSubmitBody={(values) => ({ formData: values })}
          buttonTextOverride={
            event.registrationApprovalMode === "manual"
              ? "Submit Registration Request"
              : "Register for This Event"
          }
          onSubmitSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "registration"] });
          }}
          compact
        />
      </>,
      "card-registration-custom-form",
    );
  }

  return renderShell(
    <>
      <div className="flex items-center gap-3 mb-3">
        <Ticket className="h-5 w-5 text-accent" />
        <h3 className="font-heading text-lg font-semibold">Register for This Event</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {isPaid
          ? `Secure your spot for this event. Registration fee: ${formatCurrency(event.registrationFee || 0, event.registrationCurrency || "usd")}.`
          : "Secure your spot for this free event. You'll receive a confirmation email after registering."}
      </p>
      {isPaid ? (
        <Button
          onClick={() => payMutation.mutate()}
          disabled={payMutation.isPending}
          data-testid="button-register-and-pay"
        >
          {payMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Ticket className="mr-2 h-4 w-4" />
          )}
          Register & Pay{" "}
          {formatCurrency(event.registrationFee || 0, event.registrationCurrency || "usd")}
        </Button>
      ) : (
        <Button
          onClick={() => registerMutation.mutate()}
          disabled={registerMutation.isPending}
          data-testid="button-register-event"
        >
          {registerMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Ticket className="mr-2 h-4 w-4" />
          )}
          Register for This Event
        </Button>
      )}
    </>,
    "card-registration-register",
  );
}

function EventOverviewCard({
  event,
  displayLocationName,
  showMap,
}: {
  event: Event;
  displayLocationName?: string | null;
  showMap: boolean;
}) {
  return (
    <Card
      className={showMap ? "mb-8 overflow-hidden" : "mb-2 overflow-hidden"}
      data-testid="card-event-overview"
    >
      {event.imageUrl && (
        <div className="aspect-[21/9] overflow-hidden bg-muted" data-testid="img-event-cover">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
            style={getImageObjectPositionStyle(event.imagePositionX, event.imagePositionY)}
          />
        </div>
      )}
      <CardContent className="p-5 sm:p-6">
        <div className="space-y-5">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(220px,272px)] md:items-start">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </h2>
                  <p className="font-medium" data-testid="text-event-detail-date">
                    {formatEventDate(event.date, event.timezone, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {event.endDate &&
                    new Date(event.endDate).toDateString() !==
                      new Date(event.date).toDateString() && (
                      <p className="text-sm text-muted-foreground">
                        to{" "}
                        {formatEventDate(event.endDate, event.timezone, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Time
                  </h2>
                  <p className="font-medium" data-testid="text-event-detail-time">
                    {formatEventTime(event.date, event.timezone, { timeZoneName: "short" })}
                    {event.endDate &&
                      ` — ${formatEventTime(event.endDate, event.timezone, { timeZoneName: "short" })}`}
                  </p>
                  {event.timezone && (
                    <p className="text-sm text-muted-foreground" data-testid="text-event-timezone">
                      <Globe className="inline mr-1 h-3 w-3" />
                      {event.timezone}
                    </p>
                  )}
                </div>
              </div>

              {event.capacity && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Capacity
                    </h2>
                    <p className="font-medium" data-testid="text-event-capacity">
                      {event.capacity}
                      {event.waitlistEnabled && (
                        <span className="text-sm text-muted-foreground ml-2">
                          (waitlist available)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {(displayLocationName || event.locationAddress || event.location) && (
              <div className="min-w-0 space-y-3">
                {showMap && (
                  <EventLocationMap
                    latitude={event.latitude}
                    longitude={event.longitude}
                    address={event.locationAddress}
                    locationName={displayLocationName || event.location || undefined}
                    className="aspect-[5/4] w-full max-w-[272px] overflow-hidden rounded-lg border"
                  />
                )}
                <div className="space-y-3 rounded-lg border bg-muted/35 p-4">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <MapPin className="h-5 w-5 flex-shrink-0 text-accent" />
                      Venue
                    </h2>
                    {displayLocationName ? (
                      <p className="font-medium" data-testid="text-event-detail-location">
                        {displayLocationName}
                      </p>
                    ) : event.location ? (
                      <p className="font-medium" data-testid="text-event-detail-location">
                        {event.location}
                      </p>
                    ) : null}
                    {event.locationAddress && (
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid="text-event-detail-address"
                      >
                        {event.locationAddress}
                      </p>
                    )}
                  </div>
                  <EventDirectionsDropdown
                    event={event}
                    displayLocationName={displayLocationName}
                  />
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <div className="border-t pt-5">
              <h2 className="font-heading text-lg font-semibold mb-3">About This Event</h2>
              <div
                className="prose prose-sm sm:prose-base max-w-none text-muted-foreground"
                data-testid="text-event-detail-description"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}

          {event.speakerName && (
            <div className="border-t pt-5" data-testid="section-speaker">
              <h2 className="font-heading text-lg font-semibold mb-4">Speaker / Host</h2>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  {event.speakerImageUrl && (
                    <AvatarImage src={event.speakerImageUrl} alt={event.speakerName} />
                  )}
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg" data-testid="text-speaker-name">
                    {event.speakerName}
                  </p>
                  {event.speakerBio && (
                    <p
                      className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap"
                      data-testid="text-speaker-bio"
                    >
                      {event.speakerBio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RegistrationSummary({
  event,
  registrationState,
}: {
  event: Event;
  registrationState: "open" | "closed" | "upcoming" | "none";
}) {
  if (!event.registrationEnabled) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {event.registrationType === "free" ? (
          <Badge variant="outline" data-testid="badge-registration-free">
            Free Event
          </Badge>
        ) : event.registrationFee ? (
          <Badge variant="outline" data-testid="badge-registration-paid">
            {formatCurrency(event.registrationFee, event.registrationCurrency || "usd")}
          </Badge>
        ) : null}
        {registrationState === "open" && (
          <Badge className="bg-green-600/15 text-green-700 border-green-600/30">Open</Badge>
        )}
        {registrationState === "closed" && (
          <Badge variant="outline" className="opacity-60">
            Closed
          </Badge>
        )}
        {registrationState === "upcoming" && event.registrationOpensAt && (
          <Badge variant="outline">
            Opens{" "}
            {formatEventDate(event.registrationOpensAt, event.timezone, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground space-y-1">
        {event.registrationOpensAt && registrationState !== "upcoming" && (
          <p data-testid="text-registration-opens">
            Opened:{" "}
            {formatEventDate(event.registrationOpensAt, event.timezone, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        {event.registrationClosesAt && (
          <p data-testid="text-registration-closes">
            {registrationState === "closed" ? "Closed" : "Closes"}:{" "}
            {formatEventDate(event.registrationClosesAt, event.timezone, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            at{" "}
            {formatEventTime(event.registrationClosesAt, event.timezone, { timeZoneName: "short" })}
          </p>
        )}
        {event.waitlistEnabled && (
          <p data-testid="text-waitlist-enabled">Waitlist is available if capacity is reached.</p>
        )}
      </div>
    </div>
  );
}

function JoinEventPanel({
  event,
  joinUrl,
  displayLocationName,
  isHybrid,
  userHasAccess,
}: {
  event: Event;
  joinUrl?: string | null;
  displayLocationName?: string | null;
  isHybrid: boolean | string | null | undefined;
  userHasAccess: boolean;
}) {
  if (!userHasAccess && event.visibility !== "public") {
    return (
      <div className="space-y-3" data-testid="section-event-join">
        <h3 className="font-heading text-lg font-semibold">
          {event.isVirtual ? "Join This Event" : "Attend This Event"}
        </h3>
        <p className="text-sm text-muted-foreground">
          <Lock className="inline mr-1 h-4 w-4" />
          This event requires membership access. Log in or join the network to view event details.
        </p>
        <Link href="/join">
          <Button variant="outline" data-testid="button-join-network">
            Join the Network
          </Button>
        </Link>
      </div>
    );
  }

  if (event.isVirtual && joinUrl) {
    return (
      <div className="space-y-4" data-testid="section-event-join">
        <h3 className="font-heading text-lg font-semibold">Join This Event</h3>
        <p className="text-sm text-muted-foreground">
          {isHybrid
            ? "This is a hybrid event. You can attend virtually or in person."
            : "This is a virtual event. Click below to join."}
        </p>
        <a href={joinUrl} target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            className="bg-accent text-accent-foreground border-accent-border"
            data-testid="button-event-join"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Join Virtual Event
          </Button>
        </a>
        {event.virtualDialInInfo && (
          <div className="mt-2 rounded-md border p-4" data-testid="section-dial-in">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Dial-In Information</p>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
              {event.virtualDialInInfo}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!event.registrationEnabled && !event.isVirtual) {
    return (
      <div className="space-y-4" data-testid="section-event-join">
        <h3 className="font-heading text-lg font-semibold">Attend This Event</h3>
        <p className="text-sm text-muted-foreground">
          {displayLocationName
            ? `This event will be held at ${displayLocationName}. Registration details will be provided soon.`
            : "Registration details will be provided soon. Please check back for updates."}
        </p>
      </div>
    );
  }

  if (!event.registrationEnabled && event.isVirtual && !joinUrl) {
    return (
      <div className="space-y-4" data-testid="section-event-join">
        <h3 className="font-heading text-lg font-semibold">Join This Event</h3>
        <p className="text-sm text-muted-foreground">
          Virtual event details will be provided soon. Please check back for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="section-event-join">
      <h3 className="font-heading text-lg font-semibold">
        {event.isVirtual ? "Join This Event" : "Attend This Event"}
      </h3>
      <p className="text-sm text-muted-foreground">
        Event access details will be provided after registration.
      </p>
    </div>
  );
}

function EventParticipationCard({
  event,
  user,
  registrationState,
  joinUrl,
  displayLocationName,
  isHybrid,
  isPast,
  isCanceled,
  isCompleted,
  userHasAccess,
}: {
  event: Event;
  user: { id: string; role: string; email: string; firstName: string | null } | null | undefined;
  registrationState: "open" | "closed" | "upcoming" | "none";
  joinUrl?: string | null;
  displayLocationName?: string | null;
  isHybrid: boolean | string | null | undefined;
  isPast: boolean;
  isCanceled: boolean;
  isCompleted: boolean;
  userHasAccess: boolean;
}) {
  const showActions = !isPast && !isCanceled && !isCompleted;

  return (
    <Card className="mb-8" data-testid="section-registration-info">
      <CardContent className="p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold mb-3">Registration</h2>
        <RegistrationSummary event={event} registrationState={registrationState} />

        {showActions && (
          <div className="mt-6 grid gap-6 border-t pt-6 md:grid-cols-2">
            <JoinEventPanel
              event={event}
              joinUrl={joinUrl}
              displayLocationName={displayLocationName}
              isHybrid={isHybrid}
              userHasAccess={userHasAccess}
            />

            {event.registrationEnabled ? (
              <RegistrationSection
                event={event}
                user={
                  user
                    ? {
                        id: user.id,
                        role: user.role,
                        email: user.email,
                        firstName: user.firstName ?? "",
                      }
                    : null
                }
                isPast={isPast}
                isCanceled={isCanceled}
                embedded
              />
            ) : event.memberOnly ? (
              <p className="text-sm text-muted-foreground">
                This event is exclusive to Core Platform members.{" "}
                <Link href="/join" className="text-accent underline underline-offset-2">
                  Join the network
                </Link>{" "}
                to get access.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventSeo({ event, globalSeo }: { event: Event; globalSeo?: SeoSettings }) {
  const titleSuffix = globalSeo?.titleSuffix ?? " | Core Platform";
  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const effectiveTitle = `${event.title}${titleSuffix}`;
  const effectiveDescription = event.description
    ? stripHtml(event.description)
    : globalSeo?.defaultMetaDescription || undefined;
  const effectiveOgImage = event.imageUrl || globalSeo?.defaultOgImageUrl || undefined;
  const canonical = `${siteUrl}${getEventPath(event)}`;

  useSeo({
    title: effectiveTitle,
    description: effectiveDescription,
    ogImage: effectiveOgImage,
    canonical,
  });

  const breadcrumbs = buildBreadcrumbLd([
    { name: "Home", url: siteUrl || "/" },
    { name: "Events", url: `${siteUrl}/events` },
    { name: event.title, url: canonical },
  ]);

  return (
    <JsonLd
      schemas={[
        globalSeo ? buildOrganizationLd(globalSeo) : null,
        breadcrumbs,
        buildEventLd(event, globalSeo),
        buildVideoObjectLd(event, globalSeo),
      ]}
    />
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    data: event,
    isLoading,
    error,
  } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: STALE_TIMES.CONTENT,
  });

  useFrontendEditTarget(
    event
      ? {
          kind: "event",
          id: event.id,
          label: `Edit ${event.title}`,
        }
      : null,
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast({
        title: "Registration successful!",
        description: "Your payment has been processed and your registration is confirmed.",
      });
      // Clear the query parameters without refreshing the page
      setLocation(event ? getEventPath(event) : `/events/${eventId}`, { replace: true });
      // Invalidate queries to fetch the new registration status
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registration"] });
    } else if (checkout === "canceled") {
      toast({
        title: "Registration canceled",
        description:
          "The payment process was canceled. You can try registering again when you're ready.",
      });
      setLocation(event ? getEventPath(event) : `/events/${eventId}`, { replace: true });
    }
  }, [event, eventId, setLocation, toast]);

  useEffect(() => {
    if (!event || !eventId) return;
    const canonicalSegment = getEventUrlSegment(event);
    if (eventId !== canonicalSegment && !window.location.search) {
      setLocation(getEventPath(event), { replace: true });
    }
  }, [event, eventId, setLocation]);

  const isPast = event ? new Date(event.date) < new Date() : false;
  const joinUrl = event?.virtualJoinUrl || event?.zoomLink;
  const displayLocationName = event?.locationName || event?.location;
  const isCanceled = event?.status === "canceled";
  const isDraft = event?.status === "draft";
  const isCompleted = event?.status === "completed";

  const isHybrid =
    event?.isVirtual &&
    (event?.latitude || event?.location || event?.locationName || event?.locationAddress);
  const isVirtualOnly = event?.isVirtual && !isHybrid;
  const hasGeo = event?.latitude && event?.longitude;
  const hasAddressMapFallback = !!event?.locationAddress;
  const showMap = (hasGeo || hasAddressMapFallback) && !isVirtualOnly;

  const registrationState = event ? getRegistrationState(event) : "none";
  const userHasAccess = event ? canUserAccessEvent(event, user?.role ?? null) : true;

  return (
    <PageLayout>
      <section className="relative" data-testid="section-event-detail-hero">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-3 sm:pt-8 sm:pb-4">
          <Link href="/events">
            <Button variant="ghost" className="mb-4 -ml-2" data-testid="button-back-events">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </Link>
        </div>
      </section>

      <div
        className="mx-auto max-w-3xl px-4 sm:px-6 pt-3 pb-2 sm:pt-4 sm:pb-3"
        data-testid="section-event-info"
      >
        {isLoading && <EventDetailSkeleton />}

        {error && (
          <Card>
            <CardContent
              className="py-12 text-center text-muted-foreground"
              data-testid="text-event-error"
            >
              Event not found or could not be loaded.
            </CardContent>
          </Card>
        )}

        {event && (
          <article data-testid={`event-detail-${event.id}`}>
            <EventSeo event={event} globalSeo={globalSeo} />
            {isCanceled && (
              <div
                className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 mb-6"
                data-testid="banner-event-canceled"
              >
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="font-medium text-destructive">This event has been canceled.</p>
              </div>
            )}

            {isDraft && (
              <div
                className="flex items-center gap-3 rounded-md border p-4 mb-6 opacity-70"
                data-testid="banner-event-draft"
              >
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p className="font-medium">This event is not yet published.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {event.status && event.status !== "published" && (
                <Badge
                  variant={isCanceled ? "destructive" : "secondary"}
                  data-testid="badge-event-status"
                >
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              )}
              {event.eventType && (
                <Badge variant="outline" data-testid="badge-event-type">
                  {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                </Badge>
              )}
              {event.category && (
                <Badge variant="outline" data-testid="badge-event-category">
                  {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
                </Badge>
              )}
              {isHybrid ? (
                <Badge variant="secondary" data-testid="badge-event-hybrid">
                  <Wifi className="mr-1 h-3 w-3" />
                  Hybrid
                </Badge>
              ) : event.isVirtual ? (
                <Badge variant="secondary" data-testid="badge-event-virtual">
                  <Monitor className="mr-1 h-3 w-3" />
                  Virtual
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-event-in-person">
                  <Building2 className="mr-1 h-3 w-3" />
                  In-Person
                </Badge>
              )}
              {event.memberOnly && (
                <Badge variant="outline" data-testid="badge-event-member-only">
                  <Lock className="mr-1 h-3 w-3" />
                  Members Only
                </Badge>
              )}
              {event.visibility && event.visibility !== "public" && !event.memberOnly && (
                <Badge variant="outline" data-testid="badge-event-visibility">
                  <Lock className="mr-1 h-3 w-3" />
                  {event.visibility === "members_only"
                    ? "Members Only"
                    : event.visibility === "counselors_only"
                      ? "Verified Providers Only"
                      : event.visibility === "admins_only"
                        ? "Admins Only"
                        : event.visibility}
                </Badge>
              )}
              {event.registrationEnabled && event.registrationType === "free" && (
                <Badge variant="outline" data-testid="badge-event-free">
                  <Ticket className="mr-1 h-3 w-3" />
                  Free
                </Badge>
              )}
              {event.registrationEnabled &&
                event.registrationType === "paid" &&
                event.registrationFee && (
                  <Badge variant="outline" data-testid="badge-event-paid">
                    <Ticket className="mr-1 h-3 w-3" />
                    {formatCurrency(event.registrationFee, event.registrationCurrency || "usd")}
                  </Badge>
                )}
              {registrationState === "open" && !isPast && !isCanceled && (
                <Badge
                  className="bg-green-600/15 text-green-700 border-green-600/30"
                  data-testid="badge-registration-open"
                >
                  Registration Open
                </Badge>
              )}
              {registrationState === "closed" && !isPast && !isCanceled && (
                <Badge
                  variant="outline"
                  className="opacity-60"
                  data-testid="badge-registration-closed"
                >
                  Registration Closed
                </Badge>
              )}
              {isPast && (
                <Badge variant="outline" className="opacity-60" data-testid="badge-event-past">
                  Past Event
                </Badge>
              )}
              {isPast && event.recordingUrl && (
                <Badge
                  className="bg-blue-600/15 text-blue-700 border-blue-600/30"
                  data-testid="badge-recording-available"
                >
                  <Video className="mr-1 h-3 w-3" />
                  Recording Available
                </Badge>
              )}
            </div>

            <h1
              className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
              data-testid="text-event-detail-title"
            >
              {event.title}
            </h1>

            <EventOverviewCard
              event={event}
              displayLocationName={displayLocationName}
              showMap={!!showMap}
            />
          </article>
        )}
      </div>

      {event && (
        <section
          className="mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-10 sm:pt-5 sm:pb-14"
          data-testid="section-event-registration"
        >
          {(event.registrationEnabled || (!isPast && !isCanceled && !isCompleted)) && (
            <EventParticipationCard
              event={event}
              user={user}
              registrationState={registrationState}
              joinUrl={joinUrl}
              displayLocationName={displayLocationName}
              isHybrid={isHybrid}
              isPast={isPast}
              isCanceled={isCanceled}
              isCompleted={isCompleted}
              userHasAccess={userHasAccess}
            />
          )}

          {isPast && event.recordingUrl && (
            <Card className="mb-8 border-blue-200" data-testid="section-recording">
              <CardContent className="p-5 sm:p-6">
                <h2 className="font-heading text-lg font-semibold mb-2">Recording Available</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  A recording of this event is available to watch. This recording will also be
                  available in the event archives.
                </p>
                {userHasAccess ? (
                  <div className="space-y-3">
                    <a href={event.recordingUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" data-testid="button-view-recording">
                        <Video className="mr-2 h-4 w-4" />
                        Watch Recording
                      </Button>
                    </a>
                    <p className="text-sm">
                      <Link
                        href="/recordings"
                        className="text-muted-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
                        data-testid="link-browse-recordings"
                      >
                        Browse all recordings →
                      </Link>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    <Lock className="inline mr-1 h-3 w-3" />
                    Log in to access the recording.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isPast && !event.recordingUrl && (
            <div className="pt-4" data-testid="section-event-past-notice">
              <p className="text-sm text-muted-foreground">
                This event has already taken place. Check our{" "}
                <Link href="/events" className="text-accent underline underline-offset-2">
                  events page
                </Link>{" "}
                for upcoming events.
              </p>
            </div>
          )}

          {isCanceled && !isPast && (
            <div className="pt-4" data-testid="section-event-canceled-notice">
              <p className="text-sm text-muted-foreground">
                This event has been canceled. Check our{" "}
                <Link href="/events" className="text-accent underline underline-offset-2">
                  events page
                </Link>{" "}
                for other upcoming events.
              </p>
            </div>
          )}
        </section>
      )}
    </PageLayout>
  );
}
