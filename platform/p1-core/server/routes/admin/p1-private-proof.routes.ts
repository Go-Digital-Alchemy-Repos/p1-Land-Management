import { Router } from "express";
import { ZodError } from "zod";
import { asyncHandler } from "../../middleware/error-handler";
import {
  getPrivateProof,
  updatePrivateProof,
  ProofError,
} from "../../services/p1-private-proof.service";
const router = Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getPrivateProof());
  }),
);
router.put(
  "/",
  asyncHandler(async (req, res) => {
    try {
      res.json(await updatePrivateProof(req.body, { id: req.user!.id, role: req.user!.role }));
    } catch (error) {
      if (error instanceof ProofError) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid proof metadata", errors: error.flatten() });
        return;
      }
      throw error;
    }
  }),
);
export default router;
