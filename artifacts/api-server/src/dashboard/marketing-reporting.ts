import {randomUUID} from "node:crypto";
import {Router} from "express";
import {actor, identity} from "./access";
import {pool} from "./database";
import {HttpError, requireCapability} from "./policy";
import {dates, reports, ReportFailure, marketingConnection, readMarketingReport} from "./marketing-reporting.transport";

export const marketingReportingApi = Router();
for (const [name, report] of Object.entries(reports)) {
  marketingReportingApi.get(`/marketing/reporting/${name}`, async (req, res) => {
    const a = await actor(req); requireCapability(a, report.capability);
    const query = dates.parse(req.query);
    let grantId: string | undefined;
    res.set("Cache-Control", "private, no-store");
    try {
      const connection = marketingConnection();
      const session = await identity(req);
      if (session.user.id !== a.id) throw new HttpError(401, "Sign in again");
      grantId = randomUUID();
      // Core rechecks the actual user, session, MFA and current grants.
      await pool.query("INSERT INTO core_federation_grant(id,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,$4,now()+interval '60 seconds')", [grantId,a.id,session.session.id,a.role === "owner"]);
      res.json(await readMarketingReport(connection.origin, connection.key, report.path, grantId, query));
    } catch (error) {
      if (!(error instanceof ReportFailure)) throw error;
      res.status(error.status).json({status: "unavailable", code: error.code, message: error.message});
    } finally {
      if (grantId) await pool.query("DELETE FROM core_federation_grant WHERE id=$1", [grantId]);
    }
  });
}
