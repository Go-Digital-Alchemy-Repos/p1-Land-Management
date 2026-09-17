import { z } from "zod";
export const compositionPreparation = z
  .object({
    expectedVersion: z.number().int().positive(),
    validForDays: z.number().int().min(1).max(90).default(30),
    projectId: z.string().uuid().nullable().default(null),
    schedules: z
      .array(
        z
          .object({
            basis: z.enum(["fixed_monthly", "per_visit"]),
            cadence: z.enum(["weekly", "monthly"]),
            intervalCount: z.number().int().min(1).max(52),
            localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            firstVisitOn: z.string().date(),
          })
          .strict(),
      )
      .max(2)
      .refine(
        (rows) => new Set(rows.map((row) => row.basis)).size === rows.length,
        "Choose each recurring schedule only once",
      ),
  })
  .strict();
