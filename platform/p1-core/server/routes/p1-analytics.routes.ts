import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db';
import { authenticateToken, requireAdminPermission } from '../middleware/auth';
const router = Router();
const eventSchema = z.object({
  event: z.enum(['page_view','form_start','form_error','call_click','email_click','estimate_click']),
  path: z.string().max(250).regex(/^\/[a-zA-Z0-9\-/]*$/),
  source: z.record(z.string().max(200)).optional(),
}).strict();
router.post('/events', rateLimit({windowMs:60000,limit:90,standardHeaders:true,legacyHeaders:false}), async(req,res,next)=>{
  try { const parsed=eventSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({message:'Invalid event'});
    const source: Record<string,string>={};
    for(const key of ['utm_source','utm_medium','utm_campaign']) { const value=parsed.data.source?.[key]; if(value && /^[a-zA-Z0-9 _.-]{1,120}$/.test(value))source[key]=value; }
    await pool.query('INSERT INTO p1_acquisition_events(event,path,source) VALUES($1,$2,$3)',[parsed.data.event,parsed.data.path,JSON.stringify(source)]);return res.status(204).end();
  }catch(error){next(error);}
});
router.get('/analytics', authenticateToken, requireAdminPermission('crm'), async(_req,res,next)=>{
  try { const [events,leads]=await Promise.all([
    pool.query("SELECT event,path,count(*)::int AS count FROM p1_acquisition_events WHERE created_at > now()-interval '28 days' GROUP BY event,path ORDER BY count DESC"),
    pool.query("SELECT stage,source,count(*)::int AS count FROM crm_leads WHERE created_at > now()-interval '28 days' GROUP BY stage,source ORDER BY count DESC"),
  ]);res.setHeader('Cache-Control','private, no-store');res.json({windowDays:28,events:events.rows,leads:leads.rows});}catch(error){next(error);}
});
export default router;
