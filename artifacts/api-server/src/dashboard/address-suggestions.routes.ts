import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { searchAddressSuggestions } from "./address-suggestions";

export const addressSuggestionsApi = Router();
const querySchema = z.string().trim().min(3).max(160);
const requests = new Map<string, { startedAt: number; count: number }>();

addressSuggestionsApi.get("/address-suggestions", async (req, res) => {
  const user = await actor(req);
  const parsed = querySchema.safeParse(req.query.q);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Enter at least three address characters." });
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  if (!key) return res.json({ available: false, suggestions: [] });

  const now = Date.now();
  if (requests.size > 1000) {
    for (const [id, limit] of requests)
      if (now - limit.startedAt >= 60_000) requests.delete(id);
  }
  const previous = requests.get(user.id);
  const window =
    !previous || now - previous.startedAt >= 60_000
      ? { startedAt: now, count: 0 }
      : previous;
  if (window.count >= 30)
    return res
      .status(429)
      .json({
        error:
          "Address suggestions are temporarily limited. You can enter the address manually.",
      });
  window.count += 1;
  requests.set(user.id, window);

  try {
    return res.json({
      available: true,
      suggestions: await searchAddressSuggestions(parsed.data, key),
    });
  } catch {
    return res
      .status(502)
      .json({
        error:
          "Address suggestions are unavailable. You can enter the address manually.",
      });
  }
});
