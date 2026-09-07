import { z } from "zod";

import { getDefaultEventTimeZone } from "@/lib/event-datetime";
import { EVENT_PRESET_DEFAULTS } from "@shared/schema";

export const eventFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    endDate: z.string().optional(),
    location: z.string().optional(),
    isVirtual: z.boolean().optional(),
    zoomLink: z.string().optional(),
    memberOnly: z.boolean().optional(),
    imageUrl: z.string().optional(),
    imagePositionX: z.number().default(50),
    imagePositionY: z.number().default(50),
    status: z.string().optional(),
    visibility: z.string().optional(),
    eventType: z.string().optional(),
    category: z.string().optional(),
    audience: z.string().optional(),
    format: z.string().optional(),
    deliveryMode: z.string().optional(),
    tags: z.string().optional(),
    registrationFormId: z.string().optional(),
    timezone: z.string().optional(),
    venueId: z.string().optional(),
    organizerId: z.string().optional(),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    virtualJoinUrl: z.string().optional(),
    virtualDialInInfo: z.string().optional(),
    registrationEnabled: z.boolean().optional(),
    registrationType: z.string().optional(),
    registrationFee: z.coerce.number().optional(),
    registrationCurrency: z.string().optional(),
    registrationOpensAt: z.string().optional(),
    registrationClosesAt: z.string().optional(),
    capacity: z.coerce.number().optional(),
    waitlistEnabled: z.boolean().optional(),
    registrationApprovalMode: z.string().optional(),
    recordingUrl: z.string().optional(),
    showInArchives: z.boolean().optional(),
    recordingAccess: z.string().optional(),
    recordingPrice: z.coerce.number().optional(),
    speakerName: z.string().optional(),
    speakerBio: z.string().optional(),
    speakerImageUrl: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrencePattern: z.string().optional(),
    recurrenceInterval: z.coerce.number().optional(),
    recurrenceDaysOfWeek: z.string().optional(),
    recurrenceEndDate: z.string().optional(),
    recurrenceCount: z.coerce.number().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.date && values.endDate && values.endDate < values.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be after the start date.",
      });
    }

    if (
      values.registrationOpensAt &&
      values.registrationClosesAt &&
      values.registrationClosesAt < values.registrationOpensAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationClosesAt"],
        message: "Registration close date must be after the open date.",
      });
    }

    if (values.date && values.recurrenceEndDate && values.recurrenceEndDate < values.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrenceEndDate"],
        message: "Recurrence end date must be after the event start date.",
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const venueFormSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  websiteUrl: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  parkingInfo: z.string().optional(),
  accessibilityInfo: z.string().optional(),
  transitInfo: z.string().optional(),
  arrivalNotes: z.string().optional(),
  isVirtual: z.boolean().optional(),
});

export type VenueFormValues = z.infer<typeof venueFormSchema>;

export const defaultFormValues: EventFormValues = {
  title: "",
  slug: "",
  description: "",
  date: "",
  endDate: "",
  location: "",
  isVirtual: false,
  zoomLink: "",
  memberOnly: false,
  imageUrl: "",
  imagePositionX: 50,
  imagePositionY: 50,
  status: "published",
  visibility: "public",
  eventType: "training",
  category: EVENT_PRESET_DEFAULTS.training.category,
  audience: EVENT_PRESET_DEFAULTS.training.audience,
  format: EVENT_PRESET_DEFAULTS.training.format,
  deliveryMode: EVENT_PRESET_DEFAULTS.training.deliveryMode,
  tags: "",
  registrationFormId: "",
  timezone: getDefaultEventTimeZone(),
  venueId: "none",
  organizerId: "none",
  locationName: "",
  locationAddress: "",
  latitude: "",
  longitude: "",
  virtualJoinUrl: "",
  virtualDialInInfo: "",
  registrationEnabled: EVENT_PRESET_DEFAULTS.training.registrationEnabled,
  registrationType: "free",
  registrationFee: undefined,
  registrationCurrency: "usd",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: undefined,
  waitlistEnabled: false,
  registrationApprovalMode: EVENT_PRESET_DEFAULTS.training.registrationApprovalMode,
  recordingUrl: "",
  showInArchives: false,
  recordingAccess: "free",
  recordingPrice: undefined,
  speakerName: "",
  speakerBio: "",
  speakerImageUrl: "",
  isRecurring: false,
  recurrencePattern: "",
  recurrenceInterval: 1,
  recurrenceDaysOfWeek: "",
  recurrenceEndDate: "",
  recurrenceCount: undefined,
};

export const defaultVenueFormValues: VenueFormValues = {
  name: "",
  description: "",
  address: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
  phone: "",
  email: "",
  websiteUrl: "",
  latitude: "",
  longitude: "",
  parkingInfo: "",
  accessibilityInfo: "",
  transitInfo: "",
  arrivalNotes: "",
  isVirtual: false,
};
