import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { loadLocalEnv } from "../load-env";
import { events } from "@shared/schema";

loadLocalEnv();

type EventInsert = typeof events.$inferInsert;
type SeedEvent = EventInsert & { title: string; slug: string; date: Date };

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const timezone = "America/New_York";
const eventImageUrl =
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1280&h=720&fit=crop";
const corePlatformAddress = "120 Monroe Center St NW, Grand Rapids, MI 49503";
const corePlatformCoordinates = {
  latitude: "42.9657722",
  longitude: "-85.6712830",
};

function atOffset(days: number, hour: number, minute = 0) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return new Date(base.getTime() + days * MS_PER_DAY + hour * 60 * 60 * 1000 + minute * 60 * 1000);
}

function event(data: {
  title: string;
  slug: string;
  description: string;
  days: number;
  startHour: number;
  durationMinutes: number;
  eventType: SeedEvent["eventType"];
  category: SeedEvent["category"];
  audience: SeedEvent["audience"];
  format: SeedEvent["format"];
  deliveryMode: SeedEvent["deliveryMode"];
  location: string;
  locationName?: string;
  locationAddress?: string;
  latitude?: string;
  longitude?: string;
  speakerName?: string;
  capacity?: number;
  registrationEnabled?: boolean;
  memberOnly?: boolean;
  visibility?: string;
  tags?: string[];
}): SeedEvent {
  const date = atOffset(data.days, data.startHour);
  const endDate = new Date(date.getTime() + data.durationMinutes * 60 * 1000);
  const registrationOpensAt = new Date(date.getTime() - 21 * MS_PER_DAY);
  const registrationClosesAt = new Date(date.getTime() - 2 * 60 * 60 * 1000);
  const isVirtual = data.deliveryMode === "virtual";
  const coordinates =
    data.latitude && data.longitude
      ? { latitude: data.latitude, longitude: data.longitude }
      : data.locationAddress === corePlatformAddress
        ? corePlatformCoordinates
        : {};

  return {
    title: data.title,
    slug: data.slug,
    description: data.description,
    date,
    endDate,
    location: data.location,
    locationName: data.locationName ?? data.location,
    locationAddress: data.locationAddress,
    ...coordinates,
    isVirtual,
    imageUrl: eventImageUrl,
    zoomLink: isVirtual ? "https://zoom.us/j/calendar-seed-demo" : null,
    virtualJoinUrl: isVirtual ? "https://zoom.us/j/calendar-seed-demo" : null,
    memberOnly: data.memberOnly ?? false,
    registrationEnabled: data.registrationEnabled ?? true,
    registrationType: "free",
    registrationCurrency: "usd",
    registrationOpensAt,
    registrationClosesAt,
    capacity: data.capacity ?? 40,
    waitlistEnabled: true,
    status: "published",
    visibility: data.visibility ?? "public",
    eventType: data.eventType,
    category: data.category,
    audience: data.audience,
    format: data.format,
    deliveryMode: data.deliveryMode,
    timezone,
    tags: ["calendar-seed", ...(data.tags ?? [])],
    speakerName: data.speakerName,
    speakerBio: data.speakerName
      ? `${data.speakerName} facilitates practical conversations for customers, teams, and providers.`
      : null,
    imagePositionX: 50,
    imagePositionY: 50,
  };
}

const seedEvents: SeedEvent[] = [
  event({
    title: "Identity Mapping Workshop",
    slug: "calendar-seed-identity-mapping-workshop",
    description:
      "A guided workshop for exploring belonging, transition stories, and personal identity anchors.",
    days: 2,
    startHour: 13,
    durationMinutes: 90,
    eventType: "workshop",
    category: "education",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Sarah Chen",
    capacity: 60,
    tags: ["identity", "workshop"],
  }),
  event({
    title: "Provider Office Hours",
    slug: "calendar-seed-provider-office-hours",
    description: "Open office hours for providers and coaches supporting complex customer needs.",
    days: 4,
    startHour: 11,
    durationMinutes: 60,
    eventType: "consultation",
    category: "professional_development",
    audience: "professionals",
    format: "office_hours",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "James Okonkwo",
    capacity: 25,
    tags: ["providers"],
  }),
  event({
    title: "Global Families Welcome Circle",
    slug: "calendar-seed-global-families-welcome-circle",
    description:
      "A warm community gathering for customers and teams looking for connection and resources.",
    days: 6,
    startHour: 18,
    durationMinutes: 75,
    eventType: "community_event",
    category: "community",
    audience: "public",
    format: "drop_in",
    deliveryMode: "hybrid",
    location: "Core Platform Community Room and Zoom",
    locationName: "Core Platform Community Room",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    capacity: 80,
    tags: ["families", "community"],
  }),
  event({
    title: "Reverse Culture Shock Webinar",
    slug: "calendar-seed-reverse-culture-shock-webinar",
    description:
      "Practical guidance for re-entry, grief of place, and reconnecting after a major move.",
    days: 8,
    startHour: 14,
    durationMinutes: 60,
    eventType: "webinar",
    category: "education",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Maria Gonzalez",
    capacity: 100,
    tags: ["re-entry"],
  }),
  event({
    title: "Member Case Consultation Lab",
    slug: "calendar-seed-member-case-consultation-lab",
    description:
      "A structured consultation session for member providers working with complex customer needs.",
    days: 10,
    startHour: 12,
    durationMinutes: 90,
    eventType: "training",
    category: "professional_development",
    audience: "professionals",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Member Zoom Room",
    speakerName: "David Mueller",
    capacity: 20,
    memberOnly: true,
    visibility: "members_only",
    tags: ["members", "service"],
  }),
  event({
    title: "Teen Belonging Skills Class",
    slug: "calendar-seed-teen-belonging-skills-class",
    description:
      "A strengths-based class helping teens name transitions, friendships, and support systems.",
    days: 12,
    startHour: 16,
    durationMinutes: 75,
    eventType: "class",
    category: "wellness",
    audience: "clients",
    format: "series",
    deliveryMode: "in_person",
    location: "Core Platform Studio",
    locationName: "Core Platform Studio",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    capacity: 18,
    tags: ["teens", "wellness"],
  }),
  event({
    title: "Cross-Cultural Parenting Roundtable",
    slug: "calendar-seed-customer-programs-roundtable",
    description:
      "A facilitated conversation on parenting across languages, schools, countries, and traditions.",
    days: 14,
    startHour: 19,
    durationMinutes: 90,
    eventType: "workshop",
    category: "support",
    audience: "public",
    format: "single_session",
    deliveryMode: "hybrid",
    location: "Core Platform Community Room and Zoom",
    locationName: "Core Platform Community Room",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    speakerName: "Fatima Al-Rashid",
    capacity: 50,
    tags: ["parenting"],
  }),
  event({
    title: "Mindful Transitions Practice",
    slug: "calendar-seed-mindful-transitions-practice",
    description:
      "A practical mindfulness session for grounding during moves, endings, and new beginnings.",
    days: 16,
    startHour: 9,
    durationMinutes: 45,
    eventType: "class",
    category: "wellness",
    audience: "public",
    format: "drop_in",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Claire O'Brien",
    capacity: 75,
    tags: ["mindfulness"],
  }),
  event({
    title: "Directory Member Orientation",
    slug: "calendar-seed-directory-member-orientation",
    description: "A practical onboarding session for new directory members and administrators.",
    days: 18,
    startHour: 10,
    durationMinutes: 60,
    eventType: "training",
    category: "operations",
    audience: "members",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Admin Team",
    capacity: 40,
    memberOnly: true,
    visibility: "members_only",
    tags: ["orientation"],
  }),
  event({
    title: "Community Stories Night",
    slug: "calendar-seed-community-stories-night",
    description:
      "An evening of short stories and facilitated reflection for adults shaped by global mobility.",
    days: 20,
    startHour: 18,
    durationMinutes: 120,
    eventType: "community_event",
    category: "community",
    audience: "public",
    format: "drop_in",
    deliveryMode: "in_person",
    location: "Core Platform Community Room",
    locationName: "Core Platform Community Room",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    capacity: 70,
    tags: ["storytelling"],
  }),
  event({
    title: "School Transition Planning Clinic",
    slug: "calendar-seed-school-transition-planning-clinic",
    description:
      "A clinic for families preparing children for international school moves and re-entry.",
    days: 22,
    startHour: 15,
    durationMinutes: 90,
    eventType: "consultation",
    category: "support",
    audience: "clients",
    format: "office_hours",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Ana Silva",
    capacity: 30,
    tags: ["school", "families"],
  }),
  event({
    title: "Service Documentation for Events",
    slug: "calendar-seed-service-documentation-for-events",
    description:
      "A provider training on documenting group events, registrations, and follow-up workflows.",
    days: 24,
    startHour: 13,
    durationMinutes: 75,
    eventType: "training",
    category: "professional_development",
    audience: "professionals",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Raj Sharma",
    capacity: 45,
    tags: ["training", "documentation"],
  }),
  event({
    title: "Portable Home Workshop",
    slug: "calendar-seed-portable-home-workshop",
    description:
      "A creative workshop for building rituals, routines, and objects that help home travel with you.",
    days: 26,
    startHour: 17,
    durationMinutes: 90,
    eventType: "workshop",
    category: "wellness",
    audience: "public",
    format: "single_session",
    deliveryMode: "hybrid",
    location: "Core Platform Studio and Zoom",
    locationName: "Core Platform Studio",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    speakerName: "Isabella Reyes",
    capacity: 55,
    tags: ["home", "identity"],
  }),
  event({
    title: "Global Mobility Burnout Webinar",
    slug: "calendar-seed-global-mobility-burnout-webinar",
    description:
      "A focused webinar on burnout signals, prevention, and support for busy professionals.",
    days: 28,
    startHour: 12,
    durationMinutes: 60,
    eventType: "webinar",
    category: "wellness",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Pierre Dubois",
    capacity: 120,
    tags: ["burnout"],
  }),
  event({
    title: "Provider Peer Learning Circle",
    slug: "calendar-seed-provider-peer-learning-circle",
    description:
      "A peer learning circle for providers, coaches, and support professionals in the network.",
    days: 30,
    startHour: 11,
    durationMinutes: 90,
    eventType: "community_event",
    category: "professional_development",
    audience: "professionals",
    format: "drop_in",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Mei-Ling Teo",
    capacity: 35,
    tags: ["providers", "peer-learning"],
  }),
  event({
    title: "College Launch Across Cultures",
    slug: "calendar-seed-college-launch-across-cultures",
    description:
      "A session for students and families navigating college launch, transitions, and support planning.",
    days: 32,
    startHour: 19,
    durationMinutes: 75,
    eventType: "webinar",
    category: "education",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Min-Jun Park",
    capacity: 90,
    tags: ["college", "young-adults"],
  }),
  event({
    title: "Community Coffee Meetup",
    slug: "calendar-seed-community-coffee-meetup",
    description: "An informal meetup for local members, families, and professionals to connect.",
    days: 34,
    startHour: 8,
    durationMinutes: 60,
    eventType: "community_event",
    category: "community",
    audience: "public",
    format: "drop_in",
    deliveryMode: "in_person",
    location: "Lantern Coffee Bar",
    locationName: "Lantern Coffee Bar",
    locationAddress: "100 Commerce Ave SW, Grand Rapids, MI 49503",
    capacity: 30,
    registrationEnabled: false,
    tags: ["meetup"],
  }),
  event({
    title: "Cultural Grief Support Group",
    slug: "calendar-seed-cultural-grief-support-group",
    description:
      "A supportive group session for naming and processing cultural grief and ambiguous loss.",
    days: 36,
    startHour: 18,
    durationMinutes: 90,
    eventType: "class",
    category: "support",
    audience: "clients",
    format: "series",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Makeda Tadesse",
    capacity: 24,
    tags: ["support", "grief"],
  }),
  event({
    title: "School Transition Provider Roundtable",
    slug: "calendar-seed-school-transition-provider-roundtable",
    description:
      "A roundtable for providers supporting students through transitions and planning stress.",
    days: 38,
    startHour: 10,
    durationMinutes: 75,
    eventType: "workshop",
    category: "professional_development",
    audience: "professionals",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Erik Lindqvist",
    capacity: 50,
    tags: ["schools", "providers"],
  }),
  event({
    title: "Family Systems Across Borders",
    slug: "calendar-seed-family-systems-across-borders",
    description:
      "A training session on family systems considerations across relocation, distance, and culture.",
    days: 40,
    startHour: 13,
    durationMinutes: 120,
    eventType: "training",
    category: "professional_development",
    audience: "professionals",
    format: "single_session",
    deliveryMode: "hybrid",
    location: "Core Platform Studio and Zoom",
    locationName: "Core Platform Studio",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    speakerName: "Joost van den Berg",
    capacity: 45,
    tags: ["family-systems"],
  }),
  event({
    title: "Newcomer Resource Fair",
    slug: "calendar-seed-newcomer-resource-fair",
    description:
      "A resource fair connecting newcomers with support providers, community groups, and learning resources.",
    days: 42,
    startHour: 15,
    durationMinutes: 180,
    eventType: "community_event",
    category: "community",
    audience: "public",
    format: "drop_in",
    deliveryMode: "in_person",
    location: "Grand Rapids Public Library",
    locationName: "Grand Rapids Public Library",
    locationAddress: "111 Library St NE, Grand Rapids, MI 49503",
    capacity: 150,
    registrationEnabled: false,
    tags: ["resource-fair"],
  }),
  event({
    title: "Attachment and Relocation Webinar",
    slug: "calendar-seed-attachment-and-relocation-webinar",
    description: "A webinar on attachment, safety cues, and connection during repeated moves.",
    days: 44,
    startHour: 14,
    durationMinutes: 60,
    eventType: "webinar",
    category: "education",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Omar Hassan",
    capacity: 110,
    tags: ["attachment", "relocation"],
  }),
  event({
    title: "Young Adult Identity Lab",
    slug: "calendar-seed-young-adult-identity-lab",
    description:
      "A practical lab for young adults making decisions about place, career, relationships, and belonging.",
    days: 46,
    startHour: 18,
    durationMinutes: 90,
    eventType: "workshop",
    category: "wellness",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    location: "Online via Zoom",
    speakerName: "Amara Joseph",
    capacity: 65,
    tags: ["young-adults"],
  }),
  event({
    title: "Executive Global Mobility Consultation Day",
    slug: "calendar-seed-executive-global-mobility-consultation-day",
    description:
      "A limited consultation day for leaders designing support programs for mobile teams.",
    days: 49,
    startHour: 9,
    durationMinutes: 240,
    eventType: "consultation",
    category: "consulting",
    audience: "invited",
    format: "one_on_one",
    deliveryMode: "virtual",
    location: "Online by appointment",
    speakerName: "Nikos Papadopoulos",
    capacity: 8,
    visibility: "public",
    tags: ["consulting", "leadership"],
  }),
  event({
    title: "Summer Community Reflection Night",
    slug: "calendar-seed-summer-community-reflection-night",
    description:
      "A seasonal reflection gathering with prompts, conversation, and next-step planning.",
    days: 52,
    startHour: 18,
    durationMinutes: 120,
    eventType: "community_event",
    category: "community",
    audience: "public",
    format: "drop_in",
    deliveryMode: "hybrid",
    location: "Core Platform Community Room and Zoom",
    locationName: "Core Platform Community Room",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    capacity: 90,
    tags: ["reflection", "community"],
  }),
];

async function upsertEvent(seedEvent: SeedEvent) {
  const [existing] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, seedEvent.slug))
    .limit(1);

  if (existing) {
    await db.update(events).set(seedEvent).where(eq(events.id, existing.id));
    return "updated";
  }

  await db.insert(events).values(seedEvent);
  return "inserted";
}

async function main() {
  let inserted = 0;
  let updated = 0;

  for (const seedEvent of seedEvents) {
    const action = await upsertEvent(seedEvent);
    if (action === "inserted") inserted += 1;
    else updated += 1;
  }

  console.log(
    `Seeded ${seedEvents.length} production calendar events (${inserted} inserted, ${updated} updated).`,
  );
  console.log(`Seed slugs use the "calendar-seed-" prefix and tags include "calendar-seed".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
