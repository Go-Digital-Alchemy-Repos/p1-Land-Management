import {
  readAgreementChargeReview,
  previewAgreementChargeReview,
  recordAgreementChargeReview,
  listAgreementChargeReviews,
  listAgreementCharges,
} from "./agreement-review.service";
import { listAgreementChargeQueue } from "./service-agreement.queue";
import { previewServiceAgreementActivation } from "./service-agreement.activation";
import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import {
  createServiceAgreement,
  editServiceAgreement,
  activateServiceAgreement,
  cancelServiceAgreement,
} from "./service-agreement.service";
import {
  prepareAgreementCharge,
  previewAgreementCharge,
} from "./service-agreement.billing";
import {
  listAgreementPreparationJobs,
  readAgreementPreparationJob,
  previewAgreementPreparationRetry,
  retryAgreementPreparation,
} from "./agreement-preparation";
import {
  readServiceAgreement,
  listServiceAgreements,
} from "./service-agreement.read";
export const serviceAgreementApi = Router();
const id = z.string().uuid();
serviceAgreementApi.get("/service-agreements", async (req, res) =>
  res.json(await listServiceAgreements(await actor(req), req.query)),
);
serviceAgreementApi.get("/service-agreements/:id", async (req, res) =>
  res.json(
    await readServiceAgreement(await actor(req), id.parse(req.params.id)),
  ),
);
serviceAgreementApi.post("/service-agreements", async (req, res) =>
  res
    .status(201)
    .json(await createServiceAgreement(await actor(req), req.body)),
);
serviceAgreementApi.patch("/service-agreements/:id", async (req, res) =>
  res.json(
    await editServiceAgreement(
      await actor(req),
      id.parse(req.params.id),
      req.body,
    ),
  ),
);
serviceAgreementApi.post("/service-agreements/:id/activate", async (req, res) =>
  res.json(
    await activateServiceAgreement(
      await actor(req),
      id.parse(req.params.id),
      req.body,
    ),
  ),
);
serviceAgreementApi.post("/service-agreements/:id/cancel", async (req, res) =>
  res.json(
    await cancelServiceAgreement(
      await actor(req),
      id.parse(req.params.id),
      req.body,
    ),
  ),
);
serviceAgreementApi.post(
  "/service-agreements/:id/charge-preview",
  async (req, res) =>
    res.json(
      await previewAgreementCharge(
        await actor(req),
        id.parse(req.params.id),
        req.body,
      ),
    ),
);
serviceAgreementApi.post("/service-agreements/:id/charges", async (req, res) =>
  res.json(
    await prepareAgreementCharge(
      await actor(req),
      id.parse(req.params.id),
      req.body,
    ),
  ),
);

serviceAgreementApi.post(
  "/service-agreements/:id/activation-preview",
  async (req, res) =>
    res.json(
      await previewServiceAgreementActivation(
        await actor(req),
        id.parse(req.params.id),
        req.body,
      ),
    ),
);

serviceAgreementApi.get("/agreement-charge-queue", async (req, res) =>
  res.json(await listAgreementChargeQueue(await actor(req), req.query)),
);

serviceAgreementApi.get("/agreement-preparation-jobs", async (req, res) =>
  res.json(await listAgreementPreparationJobs(await actor(req), req.query)),
);
serviceAgreementApi.get("/agreement-preparation-jobs/:id", async (req, res) =>
  res.json(await readAgreementPreparationJob(await actor(req), id.parse(req.params.id))),
);
serviceAgreementApi.post("/agreement-preparation-jobs/:id/retry-preview", async (req, res) =>
  res.json(await previewAgreementPreparationRetry(await actor(req), id.parse(req.params.id), req.body)),
);
serviceAgreementApi.post("/agreement-preparation-jobs/:id/retries", async (req, res) => {
  const result = await retryAgreementPreparation(await actor(req), id.parse(req.params.id), req.body);
  res.status(result.created ? 201 : 200).json(result);
});

serviceAgreementApi.get("/agreement-charges/:id/review", async (req, res) =>
  res.json(
    await readAgreementChargeReview(await actor(req), id.parse(req.params.id)),
  ),
);
serviceAgreementApi.post(
  "/agreement-charges/:id/review-preview",
  async (req, res) =>
    res.json(
      await previewAgreementChargeReview(
        await actor(req),
        id.parse(req.params.id),
        req.body,
      ),
    ),
);
serviceAgreementApi.post("/agreement-charges/:id/reviews", async (req, res) => {
  const result = await recordAgreementChargeReview(
    await actor(req),
    id.parse(req.params.id),
    req.body,
  );
  res.status(result.created ? 201 : 200).json(result.receipt);
});
serviceAgreementApi.get("/agreement-charges/:id/reviews", async (req, res) =>
  res.json(
    await listAgreementChargeReviews(
      await actor(req),
      id.parse(req.params.id),
      req.query,
    ),
  ),
);
serviceAgreementApi.get("/service-agreements/:id/charges", async (req, res) =>
  res.json(
    await listAgreementCharges(
      await actor(req),
      id.parse(req.params.id),
      req.query,
    ),
  ),
);
