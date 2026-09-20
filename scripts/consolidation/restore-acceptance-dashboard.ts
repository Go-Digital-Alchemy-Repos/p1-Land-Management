/** Isolated acceptance launcher: production Dashboard app, synthetic sessions, loopback binding. */
import {Server} from "node:net";
import {createHmac,randomUUID} from "node:crypto";
import {writeFile} from "node:fs/promises";
import {pool} from "../../artifacts/api-server/src/dashboard/database";
const database=new URL(process.env.DASHBOARD_DATABASE_URL||"");
if(process.env.NODE_ENV!=="test"||database.hostname!=="127.0.0.1"||database.pathname!=="/restore_joined_dashboard"||!process.env.P1_RESTORE_FIXTURE_STATE)
  throw Error("Disposable joined restore fixture required");
const accounts:Record<string,{id:string;cookie:string}>={};
for(const role of ["owner","recovery","manager"]){
 const id=process.env["P1_RESTORE_FIXTURE_"+role.toUpperCase()]!;
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error("Synthetic identity required");
 const token=randomUUID();
 await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',[id,"Restore "+role,id+"@example.test"]);
 await pool.query("INSERT INTO staff_profile(user_id,role,active,mfa_required) VALUES($1,$2,true,false)",[id,role==="manager"?"manager":"owner"]);
 await pool.query('INSERT INTO session(id,"userId",token,"expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',[randomUUID(),id,token]);
 accounts[role]={id,cookie:"p1-dashboard.session_token="+encodeURIComponent(token+"."+createHmac("sha256",process.env.BETTER_AUTH_SECRET!).update(token).digest("base64"))};
}
await writeFile(process.env.P1_RESTORE_FIXTURE_STATE,JSON.stringify(accounts),{mode:0o600});
// Keep the unmodified production app's listener local to this isolated test host.
const listen=Server.prototype.listen;
Server.prototype.listen=function(...args:any[]){
 if(args[1]==="0.0.0.0")args[1]="127.0.0.1";
 return Reflect.apply(listen,this,args);
} as typeof listen;
await import("../../artifacts/api-server/src/dashboard/main");
