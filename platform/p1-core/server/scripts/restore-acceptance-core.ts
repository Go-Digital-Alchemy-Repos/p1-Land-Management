/** Disposable two-process acceptance fixture. Never imported by the application.
 * Auth, federation, routes, PostgreSQL restore and AWS client are production code.
 * Only the S3 HTTP peer and fault controls are synthetic, restricted to loopback.
 */
import { createServer } from "node:https";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import path from "node:path";
import express from "express";

const env=process.env;
if(env.NODE_ENV!=="test" || env.P1_RESTORE_ACCEPTANCE_ENABLE!=="true" || env.RAILWAY_PROJECT_ID)
  throw Error("Disposable acceptance mode required");
const database=new URL(env.DATABASE_URL||"");
if(!["127.0.0.1","localhost"].includes(database.hostname)||database.pathname!=="/core_restore_acceptance_test"||database.search)
  throw Error("Dedicated loopback acceptance database required");
const origin=new URL(env.APP_URL||"");
if(origin.protocol!=="https:"||origin.hostname!=="127.0.0.1"||origin.pathname!=="/"||origin.search||origin.hash||origin.username||origin.password)
  throw Error("Loopback HTTPS origin required");
const directory=path.resolve(env.P1_RESTORE_ACCEPTANCE_ARCHIVES||"");
if(!directory.startsWith("/private/tmp/")&&!directory.startsWith("/tmp/")) throw Error("Private temporary archive directory required");
await mkdir(directory,{recursive:true,mode:0o700});
const actors=JSON.parse(env.P1_RESTORE_ACCEPTANCE_ACTORS||"[]") as {canonicalId:string;coreId:string;email:string}[];
if(!actors.length || actors.some(a=>![a.canonicalId,a.coreId,a.email].every(v=>typeof v==="string"&&v.length>0))) throw Error("Synthetic actors required");
env.BACKUP_S3_ENDPOINT=origin.origin;
env.BACKUP_S3_ACCESS_KEY_ID="synthetic-access";
env.BACKUP_S3_SECRET_ACCESS_KEY="synthetic-secret-only";
env.BACKUP_S3_BUCKET="restore-acceptance";
env.BACKUP_S3_REGION="us-east-1";
env.BACKUP_S3_FORCE_PATH_STYLE="true";
env.AWS_REQUEST_CHECKSUM_CALCULATION="WHEN_REQUIRED";
env.SYSTEM_BACKUP_EXCLUDED_TABLES="session,__drizzle_migrations";
const {pool}=await import("../db");
await pool.query("CREATE SCHEMA IF NOT EXISTS p1_acceptance; CREATE TABLE IF NOT EXISTS p1_acceptance.migrations(name text PRIMARY KEY)");
const migrations=new URL("../../p1-migrations/",import.meta.url);
for(const name of (await readdir(migrations)).filter(n=>/^\d{4}.*\.sql$/.test(n)).sort()){
  if((await pool.query("SELECT 1 FROM p1_acceptance.migrations WHERE name=$1",[name])).rowCount) continue;
  const client=await pool.connect();
  try {await client.query("BEGIN");await client.query(await readFile(new URL(name,migrations),"utf8"));await client.query("INSERT INTO p1_acceptance.migrations VALUES($1)",[name]);await client.query("COMMIT");}
  catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
for(const actor of actors){
  await pool.query(`INSERT INTO users(id,email,password,role,first_name) VALUES($1,$2,'!synthetic-disabled-password','admin','Synthetic') ON CONFLICT(id) DO NOTHING`,[actor.coreId,actor.email]);
  await pool.query(`INSERT INTO p1_identity_link(core_user_id,canonical_user_id,initial_grant_id) VALUES($1,$2,$3) ON CONFLICT(canonical_user_id) DO NOTHING`,[actor.coreId,actor.canonicalId,randomUUID()]);
}
await pool.query("CREATE TABLE IF NOT EXISTS acceptance_business(id integer PRIMARY KEY, label text NOT NULL); INSERT INTO acceptance_business VALUES(1,'archived-value') ON CONFLICT(id) DO NOTHING");
const app=express();
// Minimal disk-backed S3 peer; requests still traverse the real AWS client/storage service.
const xml=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
app.use("/restore-acceptance",(req,_res,next)=>{
  // S3 stores Content-Encoding as object metadata; Express must not gunzip PUT bytes.
  delete req.headers["content-encoding"];
  next();
},express.raw({type:()=>true,limit:"64mb",inflate:false}),async(req,res,next)=>{
  try {
    const key=decodeURIComponent(req.path.replace(/^\//,""));
    if(key.split("/").some(p=>p===".."||p===".")) return void res.sendStatus(400);
    const token=createHash("sha256").update(key).digest("hex"), file=path.join(directory,token);
    if(req.method==="GET" && req.query["list-type"]==="2"){
      const prefix=String(req.query.prefix||"");const entries=[];
      for(const n of await readdir(directory)) if(n.endsWith(".json")){
        const meta=JSON.parse(await readFile(path.join(directory,n),"utf8"));
        if(meta.key.startsWith(prefix)) entries.push(`<Contents><Key>${xml(meta.key)}</Key><LastModified>${meta.modified}</LastModified><Size>${meta.size}</Size></Contents>`);
      }
      res.type("application/xml").send(`<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>restore-acceptance</Name><IsTruncated>false</IsTruncated>${entries.join("")}</ListBucketResult>`);return;
    }
    if(req.method==="PUT"){
      const body=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
      await writeFile(file,body,{mode:0o600});await writeFile(file+".json",JSON.stringify({key,size:body.length,modified:new Date().toISOString()}),{mode:0o600});
      res.set("ETag",'"'+createHash("md5").update(body).digest("hex")+'"').sendStatus(200);return;
    }
    if(req.method==="GET"){
      try {const bytes=await readFile(file);res.type("application/octet-stream").send(bytes);}catch{res.sendStatus(404);}return;
    }
    // Retention deletion is intentionally unavailable: this fixture never drops archives.
    res.sendStatus(405);
  }catch(error){next(error);}
});
app.use(express.json({limit:"128kb"}));
let dropNextExecute=false;
app.use((req,res,next)=>{
  if(dropNextExecute && req.path==="/api/integrations/business-center/cms/website-system/backups/restore-execute"){
    dropNextExecute=false;
    const json=res.json.bind(res);
    res.json=((body:unknown)=>{
      if(res.statusCode===200 && (body as {outcome?:string})?.outcome==="completed") {res.socket?.destroy();return res;}
      return json(body);
    }) as typeof res.json;
  }
  next();
});
const {default:router}=await import("../routes/business-center-cms.routes");
const {errorHandler}=await import("../middleware/error-handler");
app.use("/api/integrations/business-center/cms",router);
app.use(errorHandler);
const server=createServer({key:await readFile(env.P1_RESTORE_ACCEPTANCE_TLS_KEY!),cert:await readFile(env.P1_RESTORE_ACCEPTANCE_TLS_CERT!)},app);
await new Promise<void>(resolve=>server.listen(Number(origin.port),"127.0.0.1",resolve));
const emit=(value:unknown)=>process.stdout.write("P1_RESTORE_ACCEPTANCE "+JSON.stringify(value)+"\n");
const {runSystemBackup,reserveSystemBackupRestoreReview}=await import("../services/system-backup.service");
emit({ready:true,origin:origin.origin});
let chain=Promise.resolve();
const lines=createInterface({input:process.stdin});
lines.on("line",line=>{chain=chain.then(async()=>{
  let id:unknown;
  try {
    const input=JSON.parse(line);id=input.id;
    let result:unknown;
    switch(input.command){
      case "diagnose-review": result=await reserveSystemBackupRestoreReview(input.key,{operationId:input.operationId,actorId:input.actorId});break;
      case "backup": {const manifest=await runSystemBackup();result={key:manifest.key,tableCount:manifest.tableCount};break;}
      case "mutate": if(typeof input.label!=="string"||input.label.length>100)throw Error("Invalid label");await pool.query("UPDATE acceptance_business SET label=$1 WHERE id=1",[input.label]);result={updated:true};break;
      case "inspect": result={business:(await pool.query("SELECT * FROM acceptance_business ORDER BY id")).rows,receipts:(await pool.query("SELECT operation_id,status FROM p1_operations.restore_receipts ORDER BY operation_id")).rows,authLinks:Number((await pool.query("SELECT count(*) FROM p1_identity_link WHERE revoked_at IS NULL")).rows[0].count)};break;
      case "fault-next-execute-response":dropNextExecute=true;result={armed:true};break;
      case "stop":emit({id,result:{stopped:true}});server.close();await pool.end();lines.close();process.exit(0);
      default:throw Error("Unknown control command");
    }
    emit({id,result});
  } catch(error){emit({id,error:error instanceof Error?error.message:"Fixture command failed"});}
});});
process.on("SIGTERM",()=>{server.close();void pool.end().finally(()=>process.exit(0));});
