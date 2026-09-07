import { eq, gte, lt, lte, asc, desc, and, or, sql } from "drizzle-orm";
import { db } from "../db";
import { events, type Event, type InsertEvent } from "@shared/schema";

type EventInsert = typeof events.$inferInsert;

export class EventStorage {
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventBySlug(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
    return event;
  }

  async getEventByIdentifier(identifier: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(or(eq(events.id, identifier), eq(events.slug, identifier)));
    return event;
  }

  async getEventSlugOwner(slug: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.slug, slug));
    return event;
  }

  async getAllEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(asc(events.date));
  }

  async getPublishedEvents(): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(and(eq(events.status, "published"), eq(events.visibility, "public")))
      .orderBy(asc(events.date));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(
        and(
          gte(events.date, new Date()),
          eq(events.status, "published"),
          eq(events.visibility, "public"),
        ),
      )
      .orderBy(asc(events.date));
  }

  async getRecordingEvents(): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(
        and(
          lt(events.date, new Date()),
          eq(events.status, "published"),
          sql`${events.recordingUrl} IS NOT NULL`,
          eq(events.showInArchives, true),
        ),
      )
      .orderBy(desc(events.date));
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(data as EventInsert)
      .returning();
    return event;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(data as Partial<EventInsert>)
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    await db.delete(events).where(eq(events.id, id));
    return true;
  }

  async getEventsInDateRange(from: Date, to: Date): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(and(gte(events.date, from), lte(events.date, to), eq(events.status, "published")));
  }
}
