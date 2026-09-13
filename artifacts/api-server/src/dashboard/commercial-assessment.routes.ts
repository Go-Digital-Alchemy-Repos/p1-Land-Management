import { Router } from "express";
import { actor } from "./access";
import {
  archiveCommercialAssessmentBaseline,
  bookCommercialAssessmentAppointment,
  cancelCommercialAssessmentAppointment,
  createCommercialAssessmentBaseline,
  listCommercialAssessmentBaselines,
  readCommercialAssessmentBaseline,
  reviewCommercialAssessmentBaseline,
  saveCommercialAssessmentBaseline,
} from "./commercial-assessment.service";

export const commercialAssessmentApi = Router();
commercialAssessmentApi.get("/commercial-inquiries/:id/assessment-baselines", async (req, res) => res.json(await listCommercialAssessmentBaselines(await actor(req), String(req.params.id))));
commercialAssessmentApi.post("/commercial-inquiries/:id/assessment-baselines", async (req, res) => res.status(201).json(await createCommercialAssessmentBaseline(await actor(req), String(req.params.id), req.body)));
commercialAssessmentApi.get("/commercial-inquiries/:id/assessment-baselines/:assessmentId", async (req, res) => res.json(await readCommercialAssessmentBaseline(await actor(req), String(req.params.id), String(req.params.assessmentId))));
commercialAssessmentApi.put("/commercial-inquiries/:id/assessment-baselines/:assessmentId", async (req, res) => res.json(await saveCommercialAssessmentBaseline(await actor(req), String(req.params.id), String(req.params.assessmentId), req.body)));
commercialAssessmentApi.post("/commercial-inquiries/:id/assessment-baselines/:assessmentId/review", async (req, res) => res.json(await reviewCommercialAssessmentBaseline(await actor(req), String(req.params.id), String(req.params.assessmentId), req.body)));
commercialAssessmentApi.post("/commercial-inquiries/:id/assessment-baselines/:assessmentId/archive", async (req, res) => res.json(await archiveCommercialAssessmentBaseline(await actor(req), String(req.params.id), String(req.params.assessmentId), req.body)));

commercialAssessmentApi.post("/commercial-inquiries/:id/assessment-baselines/:assessmentId/appointment", async (req, res) => res.status(201).json(await bookCommercialAssessmentAppointment(await actor(req), String(req.params.id), String(req.params.assessmentId), req.body)));
commercialAssessmentApi.post("/commercial-inquiries/:id/assessment-baselines/:assessmentId/appointment/:appointmentId/cancel", async (req, res) => res.json(await cancelCommercialAssessmentAppointment(await actor(req), String(req.params.id), String(req.params.assessmentId), String(req.params.appointmentId), req.body)));
