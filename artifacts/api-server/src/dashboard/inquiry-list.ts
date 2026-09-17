import { Router } from "express";
import { actor } from "./access";
import { requireCapability } from "./policy";
import { listSalesInquiries } from "./inquiry-list.service";
export const inquiryListApi = Router();
inquiryListApi.get("/sales/inquiries", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await listSalesInquiries(req.query));
});
