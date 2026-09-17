import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireCapability } from "./policy";
import { requireOperationalProperty } from "./operational-property";
import {
  allocatedBillingCapacity,
  estimateAllocations,
} from "./estimate-allocation";
export const estimateAllocationApi = Router();
estimateAllocationApi.get(
  "/estimates/:id/billing-allocations",
  async (req, res) => {
    requireCapability(await actor(req), "revenue.billing");
    const id = z.string().uuid().parse(req.params.id);
    res.json(
      await transaction(async (c) => {
        const identity = (
          await c.query("SELECT property_id FROM estimate WHERE id=$1", [id])
        ).rows[0];
        if (!identity) throw new HttpError(404, "Estimate not found");
        await requireOperationalProperty(c, identity.property_id);
        const estimate = (
          await c.query(
            "SELECT id,amount_cents FROM estimate WHERE id=$1 AND status='approved' FOR UPDATE",
            [id],
          )
        ).rows[0];
        if (!estimate)
          throw new HttpError(409, "An approved estimate is required");
        const capacity = await allocatedBillingCapacity(c, estimate, null);
        const allocations = [];
        for (const allocation of await estimateAllocations(c, id)) {
          const component = await allocatedBillingCapacity(
            c,
            estimate,
            allocation,
          );
          allocations.push({
            id: allocation.id,
            title: allocation.title,
            basis: allocation.basis,
            approvedCents: component.approved,
            billedCents: component.billed,
            remainingCents: component.remaining,
          });
        }
        return {
          estimateId: id,
          approvedCents: capacity.approved,
          billedCents: capacity.billed,
          remainingCents: capacity.remaining,
          allocations,
        };
      }),
    );
  },
);
