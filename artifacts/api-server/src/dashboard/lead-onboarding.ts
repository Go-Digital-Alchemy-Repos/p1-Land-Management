import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireCapability } from "./policy";
import {
  getLeadOnboarding,
  onboardLeadCustomer,
} from "./lead-onboarding.service";
export const leadOnboardingApi = Router();
for (const method of ["get", "post"] as const)
  leadOnboardingApi[method]("/leads/:id/onboarding", async (req, res) => {
    const user = await actor(req);
    requireCapability(user, "revenue.sales");
    requireCapability(user, "customers.clients");
    res.setHeader("Cache-Control", "private, no-store");
    const id = z.string().uuid().parse(req.params.id);
    res.json(
      method === "get"
        ? await getLeadOnboarding(id)
        : await onboardLeadCustomer(id, user.id, req.body),
    );
  });
