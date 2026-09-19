import { CoreArchivePresentationHost } from "@/features/admin/cms/builder/core-archive-presentation-host";
import { RecordingArchivesPresentation } from "@/features/admin/cms/builder/recording-archives-presentation";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, Redirect, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema/events";
import { getEventPath } from "@shared/event-url";
import type { RecordingPurchase } from "@shared/schema/recording-purchases";
import { PageLayout } from "@/components/layout/page-layout";
import { stripHtml } from "@/lib/html";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  User,
  Video,
  Play,
  ExternalLink,
  Filter,
  Lock,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getVideoEmbedUrl(url: string) {
  if (!url) return null;

  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }

  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  }

  return null;
}

export function RecordingArchivesSection({ props = {} }: { props?: Record<string, unknown> }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearch();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: recordings, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/recordings"],
  });

  const { data: purchases } = useQuery<RecordingPurchase[]>({
    queryKey: ["/api/events/recordings/my-purchases"],
    enabled: !!user,
  });

  const purchasedEventIds = useMemo(() => {
    if (!purchases) return new Set<string>();
    return new Set(purchases.filter((p) => p.stripePaymentIntentId).map((p) => p.eventId));
  }, [purchases]);

  const purchaseMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("POST", "/api/stripe/create-recording-checkout", { eventId });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    },
  });

  const embedUrl = selectedEvent?.recordingUrl
    ? getVideoEmbedUrl(selectedEvent.recordingUrl)
    : null;

  if (user && user.role === "client") {
    return <Redirect to="/" />;
  }

  const checkoutStatus = new URLSearchParams(searchParams).get("checkout");
  if (checkoutStatus === "success") {
    queryClient.invalidateQueries({ queryKey: ["/api/events/recordings/my-purchases"] });
  }

  return (
    <CoreArchivePresentationHost>
      <RecordingArchivesPresentation
        props={props}
        recordings={recordings}
        isLoading={isLoading}
        purchasedEventIds={purchasedEventIds}
        isLoggedIn={!!user}
        purchasingId={purchaseMutation.isPending ? purchaseMutation.variables : undefined}
        checkoutStatus={checkoutStatus}
        onWatch={setSelectedEvent}
        onPurchase={(eventId) => purchaseMutation.mutate(eventId)}
        playback={
          <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden" data-testid="dialog-playback">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="pr-8 truncate" data-testid="text-dialog-title">
                  {selectedEvent?.title}
                </DialogTitle>
              </DialogHeader>
              <div className="bg-black aspect-video flex flex-col items-center justify-center">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    data-testid="iframe-player"
                  />
                ) : selectedEvent?.recordingUrl ? (
                  <div className="p-8 text-center text-white space-y-4">
                    <p className="text-lg">This recording is hosted on an external platform.</p>
                    <Button asChild size="lg" data-testid="button-open-external">
                      <a
                        href={selectedEvent.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Recording
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        }
      />
    </CoreArchivePresentationHost>
  );
}

export default function RecordingArchivesPage() {
  return (
    <PageLayout>
      <RecordingArchivesSection />
    </PageLayout>
  );
}
