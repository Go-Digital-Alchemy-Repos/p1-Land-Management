import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@shared/schema/events";
import type { EventRegistration } from "@shared/schema/event-registrations";

const mocks = vi.hoisted(() => ({
  getEventsInDateRange: vi.fn(),
  getConfirmedRegistrationsNeedingReminder: vi.fn(),
  markReminderSent: vi.fn(),
  sendEventReminderEmail: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    events: { getEventsInDateRange: mocks.getEventsInDateRange },
    eventRegistrations: {
      getConfirmedRegistrationsNeedingReminder: mocks.getConfirmedRegistrationsNeedingReminder,
      markReminderSent: mocks.markReminderSent,
    },
  },
}));

vi.mock("../services/email.service", () => ({
  sendEventReminderEmail: mocks.sendEventReminderEmail,
}));

vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), error: vi.fn() }, email: { warn: vi.fn() } },
}));

const event = (registrationType: "free" | "paid" | null) =>
  ({
    id: "event-1",
    title: "Virtual event",
    date: new Date("2030-01-01T12:00:00.000Z"),
    registrationType,
    location: null,
    locationName: null,
    isVirtual: true,
    virtualJoinUrl: "https://meeting.example.test/join",
  }) as Event;

const registration = (paymentStatus: "not_required" | "pending" | "paid") =>
  ({
    id: "registration-1",
    eventId: "event-1",
    fullName: "Alex Rivera",
    email: "alex@example.test",
    paymentStatus,
  }) as EventRegistration;

describe("event reminder payment eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markReminderSent.mockResolvedValue(undefined);
    mocks.sendEventReminderEmail.mockResolvedValue(true);
  });

  it("sends and records a reminder for a free confirmed registration", async () => {
    mocks.getEventsInDateRange.mockResolvedValue([event("free")]);
    mocks.getConfirmedRegistrationsNeedingReminder.mockResolvedValue([
      registration("not_required"),
    ]);
    const { runEventReminders } = await import("../services/event-reminder.service");

    await runEventReminders();

    expect(mocks.sendEventReminderEmail).toHaveBeenCalledTimes(1);
    expect(mocks.markReminderSent).toHaveBeenCalledWith(["registration-1"]);
  });

  it("continues to send legacy reminders without a registration type", async () => {
    mocks.getEventsInDateRange.mockResolvedValue([event(null)]);
    mocks.getConfirmedRegistrationsNeedingReminder.mockResolvedValue([
      registration("not_required"),
    ]);
    const { runEventReminders } = await import("../services/event-reminder.service");

    await runEventReminders();

    expect(mocks.sendEventReminderEmail).toHaveBeenCalledTimes(1);
    expect(mocks.markReminderSent).toHaveBeenCalledWith(["registration-1"]);
  });

  it("does not send or mark a paid event reminder before payment clears", async () => {
    mocks.getEventsInDateRange.mockResolvedValue([event("paid")]);
    mocks.getConfirmedRegistrationsNeedingReminder.mockResolvedValue([registration("pending")]);
    const { runEventReminders } = await import("../services/event-reminder.service");

    await runEventReminders();

    expect(mocks.sendEventReminderEmail).not.toHaveBeenCalled();
    expect(mocks.markReminderSent).not.toHaveBeenCalled();
  });

  it("sends the same paid registration after its payment state becomes paid", async () => {
    mocks.getEventsInDateRange.mockResolvedValue([event("paid")]);
    mocks.getConfirmedRegistrationsNeedingReminder
      .mockResolvedValueOnce([registration("pending")])
      .mockResolvedValueOnce([registration("paid")]);
    const { runEventReminders } = await import("../services/event-reminder.service");

    await runEventReminders();
    await runEventReminders();

    expect(mocks.sendEventReminderEmail).toHaveBeenCalledTimes(1);
    expect(mocks.markReminderSent).toHaveBeenCalledWith(["registration-1"]);
  });
});
