import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  eventOrganizers,
  eventVenues,
  type EventOrganizer,
  type EventVenue,
  type InsertEventOrganizer,
  type InsertEventVenue,
} from "@shared/schema";

type EventVenueInsert = typeof eventVenues.$inferInsert;
type EventOrganizerInsert = typeof eventOrganizers.$inferInsert;

export class EventVenuesStorage {
  async getAllVenues(): Promise<EventVenue[]> {
    return db.select().from(eventVenues).orderBy(asc(eventVenues.name));
  }

  async getVenue(id: string): Promise<EventVenue | undefined> {
    const [venue] = await db.select().from(eventVenues).where(eq(eventVenues.id, id));
    return venue;
  }

  async getVenueSlugOwner(slug: string): Promise<EventVenue | undefined> {
    const [venue] = await db.select().from(eventVenues).where(eq(eventVenues.slug, slug));
    return venue;
  }

  async createVenue(data: InsertEventVenue): Promise<EventVenue> {
    const [venue] = await db
      .insert(eventVenues)
      .values(data as EventVenueInsert)
      .returning();
    return venue;
  }

  async updateVenue(id: string, data: Partial<InsertEventVenue>): Promise<EventVenue | undefined> {
    const [venue] = await db
      .update(eventVenues)
      .set({ ...(data as Partial<EventVenueInsert>), updatedAt: new Date() })
      .where(eq(eventVenues.id, id))
      .returning();
    return venue;
  }

  async deleteVenue(id: string): Promise<EventVenue | undefined> {
    const [venue] = await db.delete(eventVenues).where(eq(eventVenues.id, id)).returning();
    return venue;
  }
}

export class EventOrganizersStorage {
  async getAllOrganizers(): Promise<EventOrganizer[]> {
    return db.select().from(eventOrganizers).orderBy(asc(eventOrganizers.name));
  }

  async getOrganizer(id: string): Promise<EventOrganizer | undefined> {
    const [organizer] = await db.select().from(eventOrganizers).where(eq(eventOrganizers.id, id));
    return organizer;
  }

  async getOrganizerSlugOwner(slug: string): Promise<EventOrganizer | undefined> {
    const [organizer] = await db
      .select()
      .from(eventOrganizers)
      .where(eq(eventOrganizers.slug, slug));
    return organizer;
  }

  async createOrganizer(data: InsertEventOrganizer): Promise<EventOrganizer> {
    const [organizer] = await db
      .insert(eventOrganizers)
      .values(data as EventOrganizerInsert)
      .returning();
    return organizer;
  }

  async updateOrganizer(
    id: string,
    data: Partial<InsertEventOrganizer>,
  ): Promise<EventOrganizer | undefined> {
    const [organizer] = await db
      .update(eventOrganizers)
      .set({ ...(data as Partial<EventOrganizerInsert>), updatedAt: new Date() })
      .where(eq(eventOrganizers.id, id))
      .returning();
    return organizer;
  }

  async deleteOrganizer(id: string): Promise<EventOrganizer | undefined> {
    const [organizer] = await db
      .delete(eventOrganizers)
      .where(eq(eventOrganizers.id, id))
      .returning();
    return organizer;
  }
}
