import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, MapPin, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { apiRequest, queryClient, STALE_TIMES } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EventVenue, InsertEventVenue } from "@shared/schema";

const venuesQueryKey = ["/api/admin/events/venues"] as const;

const savedVenueFormSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  phone: z.string().optional(),
  websiteUrl: z.string().optional(),
});

type SavedVenueFormValues = z.infer<typeof savedVenueFormSchema>;

const defaultVenueValues: SavedVenueFormValues = {
  name: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  latitude: "",
  longitude: "",
  phone: "",
  websiteUrl: "",
};

function valuesFromVenue(venue: EventVenue): SavedVenueFormValues {
  return {
    name: venue.name ?? "",
    address: venue.address ?? "",
    city: venue.city ?? "",
    region: venue.region ?? "",
    postalCode: venue.postalCode ?? "",
    country: venue.country ?? "",
    latitude: venue.latitude ?? "",
    longitude: venue.longitude ?? "",
    phone: venue.phone ?? "",
    websiteUrl: venue.websiteUrl ?? "",
  };
}

function compactVenuePayload(values: SavedVenueFormValues): Partial<InsertEventVenue> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  ) as Partial<InsertEventVenue>;
}

function formatVenueAddress(venue: EventVenue): string {
  return [venue.address, venue.city, venue.region, venue.postalCode, venue.country]
    .filter(Boolean)
    .join(", ");
}

function formatCoordinates(venue: EventVenue): string {
  if (venue.latitude && venue.longitude) {
    return `${venue.latitude}, ${venue.longitude}`;
  }

  return "Not set";
}

function normalizeWebsiteUrl(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function AdminEventSettingsPage() {
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<EventVenue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventVenue | null>(null);

  const form = useForm<SavedVenueFormValues>({
    resolver: zodResolver(savedVenueFormSchema),
    defaultValues: defaultVenueValues,
  });

  const venuesQuery = useQuery<EventVenue[]>({
    queryKey: venuesQueryKey,
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const venues = useMemo(
    () => [...(venuesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [venuesQuery.data],
  );

  const saveVenueMutation = useMutation({
    mutationFn: async (values: SavedVenueFormValues) => {
      const payload = compactVenuePayload(values);
      if (editingVenue) {
        await apiRequest("PUT", `/api/admin/events/venues/${editingVenue.id}`, payload);
        return;
      }

      await apiRequest("POST", "/api/admin/events/venues", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venuesQueryKey });
      toast({
        title: editingVenue ? "Venue updated" : "Venue created",
        description: editingVenue
          ? "The saved venue has been updated."
          : "The saved venue is now available when creating events.",
      });
      setIsEditorOpen(false);
      setEditingVenue(null);
      form.reset(defaultVenueValues);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to save venue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVenueMutation = useMutation({
    mutationFn: async (venueId: string) => {
      await apiRequest("DELETE", `/api/admin/events/venues/${venueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: venuesQueryKey });
      toast({
        title: "Venue deleted",
        description: "Events using this venue are no longer linked to the saved venue record.",
      });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to delete venue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function openCreateVenue() {
    setEditingVenue(null);
    form.reset(defaultVenueValues);
    setIsEditorOpen(true);
  }

  function openEditVenue(venue: EventVenue) {
    setEditingVenue(venue);
    form.reset(valuesFromVenue(venue));
    setIsEditorOpen(true);
  }

  function handleEditorOpenChange(open: boolean) {
    setIsEditorOpen(open);
    if (!open) {
      setEditingVenue(null);
      form.reset(defaultVenueValues);
    }
  }

  function submitVenue(values: SavedVenueFormValues) {
    saveVenueMutation.mutate(values);
  }

  return (
    <AdminSidebar>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-700">
                <Settings className="h-4 w-4" />
                Event Management
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Event Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Manage reusable event configuration. Saved Venues are available when creating or
                editing events.
              </p>
            </div>
            <Button onClick={openCreateVenue} data-testid="button-create-saved-venue">
              <Plus className="mr-2 h-4 w-4" />
              Create Venue
            </Button>
          </div>

          <Tabs defaultValue="venues" className="space-y-4">
            <TabsList>
              <TabsTrigger value="venues" data-testid="tab-saved-venues">
                Saved Venues
              </TabsTrigger>
            </TabsList>
            <TabsContent value="venues">
              <Card className="rounded-lg">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Saved Venues</CardTitle>
                    <CardDescription>
                      Create and maintain venue records available when building events.
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={openCreateVenue}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Venue
                  </Button>
                </CardHeader>
                <CardContent>
                  {venuesQuery.isLoading ? (
                    <div
                      className="flex min-h-48 items-center justify-center"
                      data-testid="state-venues-loading"
                    >
                      <LoadingSpinner />
                    </div>
                  ) : venues.length === 0 ? (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-white px-6 text-center">
                      <MapPin className="mb-3 h-9 w-9 text-purple-500" />
                      <h2 className="text-lg font-semibold text-slate-950">No saved venues yet</h2>
                      <p className="mt-2 max-w-md text-sm text-slate-600">
                        Add reusable venues here so event editors can pick locations without
                        re-entering the same details.
                      </p>
                      <Button className="mt-4" onClick={openCreateVenue}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Venue
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Venue</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Coordinates</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="w-32 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {venues.map((venue) => {
                            const address = formatVenueAddress(venue);
                            const websiteUrl = normalizeWebsiteUrl(venue.websiteUrl ?? "");
                            return (
                              <TableRow key={venue.id} data-testid={`row-saved-venue-${venue.id}`}>
                                <TableCell>
                                  <div className="font-medium text-slate-950">{venue.name}</div>
                                  {venue.slug ? (
                                    <div className="text-xs text-slate-500">{venue.slug}</div>
                                  ) : null}
                                </TableCell>
                                <TableCell className="max-w-sm text-slate-600">
                                  {address || <span className="text-slate-400">No address</span>}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                  {formatCoordinates(venue)}
                                </TableCell>
                                <TableCell>
                                  {venue.phone || websiteUrl ? (
                                    <div className="space-y-1 text-sm">
                                      {venue.phone ? (
                                        <div className="text-slate-700">{venue.phone}</div>
                                      ) : null}
                                      {websiteUrl ? (
                                        <a
                                          href={websiteUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900"
                                        >
                                          Website
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">No contact details</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditVenue(venue)}
                                      data-testid={`button-edit-saved-venue-${venue.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                      <span className="sr-only">Edit {venue.name}</span>
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      onClick={() => setDeleteTarget(venue)}
                                      data-testid={`button-delete-saved-venue-${venue.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete {venue.name}</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={isEditorOpen} onOpenChange={handleEditorOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVenue ? "Edit Saved Venue" : "Create Saved Venue"}</DialogTitle>
            <DialogDescription>
              These details power the saved venue picker in the event editor.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitVenue)} className="space-y-5">
              <VenueFormFields />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEditorOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveVenueMutation.isPending}
                  data-testid="button-submit-saved-venue"
                >
                  {saveVenueMutation.isPending
                    ? "Saving..."
                    : editingVenue
                      ? "Save Venue"
                      : "Create Venue"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved venue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {deleteTarget?.name ? `"${deleteTarget.name}"` : "this venue"}.
              Events currently linked to this venue will keep their event details but will no longer
              be linked to this saved venue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteVenueMutation.isPending}
              onClick={() => deleteTarget && deleteVenueMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete-saved-venue"
            >
              Delete Venue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebar>
  );
}

function VenueFormFields() {
  const fields: Array<{
    name: keyof SavedVenueFormValues;
    label: string;
    placeholder: string;
    testId: string;
    type?: string;
  }> = [
    {
      name: "name",
      label: "Venue Name",
      placeholder: "Core Platform Studio",
      testId: "input-saved-venue-name",
    },
    {
      name: "address",
      label: "Street Address",
      placeholder: "120 Monroe Center St NW",
      testId: "input-saved-venue-address",
    },
    { name: "city", label: "City", placeholder: "Grand Rapids", testId: "input-saved-venue-city" },
    {
      name: "region",
      label: "State/Region",
      placeholder: "MI",
      testId: "input-saved-venue-region",
    },
    {
      name: "postalCode",
      label: "Postal Code",
      placeholder: "49503",
      testId: "input-saved-venue-postal-code",
    },
    { name: "country", label: "Country", placeholder: "US", testId: "input-saved-venue-country" },
    {
      name: "latitude",
      label: "Latitude",
      placeholder: "42.9634",
      testId: "input-saved-venue-latitude",
    },
    {
      name: "longitude",
      label: "Longitude",
      placeholder: "-85.6681",
      testId: "input-saved-venue-longitude",
    },
    {
      name: "phone",
      label: "Phone Number",
      placeholder: "+1 (616) 555-0100",
      testId: "input-saved-venue-phone",
      type: "tel",
    },
    {
      name: "websiteUrl",
      label: "Venue Website",
      placeholder: "https://example.com",
      testId: "input-saved-venue-website",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((fieldConfig) => (
        <FormField
          key={fieldConfig.name}
          name={fieldConfig.name}
          render={({ field }) => (
            <FormItem
              className={
                fieldConfig.name === "name" || fieldConfig.name === "address" ? "sm:col-span-2" : ""
              }
            >
              <FormLabel>{fieldConfig.label}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type={fieldConfig.type ?? "text"}
                  placeholder={fieldConfig.placeholder}
                  data-testid={fieldConfig.testId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
