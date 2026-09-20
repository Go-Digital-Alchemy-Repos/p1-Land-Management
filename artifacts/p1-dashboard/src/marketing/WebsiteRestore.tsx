import React,{useEffect,useRef,useState} from "react";
import { RotateCcw } from "lucide-react";
import { listWebsiteRestoreOperations,reviewWebsiteRestore,executeWebsiteRestore,reconcileWebsiteRestore } from "@workspace/api-client-react/dashboard";
import { scheduleDateTime } from "../schedule-dates";
type Operation=Awaited<ReturnType<typeof reviewWebsiteRestore>>;
const confirmationText="RESTORE WEBSITE DATABASE";
const labels:Record<Operation['status'],string>={reviewed:"Awaiting confirmation",running:"Outcome verification needed",uncertain:"Outcome verification needed",completed:"Restore completed",not_applied:"Restore did not commit"};
export default function WebsiteRestore({backups,disabled=false}:{backups:{key:string;createdAt:string}[];disabled?:boolean}){
  const [history,setHistory]=useState<Operation[]>([]),[selected,setSelected]=useState<Operation|null>(null);
  const [confirmation,setConfirmation]=useState(""),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState("");
  const [now,setNow]=useState(Date.now());
  const gate=useRef(false),live=useRef(true);
  const unresolved=history.some(row=>["running","uncertain"].includes(row.status));
  function remember(row:Operation){
    if(!live.current)return;
    setSelected(row);setConfirmation("");
    setHistory(previous=>[row,...previous.filter(item=>item.id!==row.id)].slice(0,50));
  }
  async function refresh(){
    if(gate.current)return;gate.current=true;setBusy(true);setReady(false);setError("");
    try{
      const rows=await listWebsiteRestoreOperations({signal:AbortSignal.timeout(30000)});
      if(live.current){setHistory(rows);setReady(true);setSelected(old=>old?rows.find(row=>row.id===old.id)??null:null);}
    }catch{if(live.current)setError("Restore history is unavailable. Refresh before starting or repeating any restore.");}
    finally{gate.current=false;if(live.current)setBusy(false);}
  }
  async function review(key:string){
    if(gate.current||!ready||unresolved||disabled)return;gate.current=true;setBusy(true);setError("");
    try{remember(await reviewWebsiteRestore({key},{signal:AbortSignal.timeout(30000)}));}
    catch{if(live.current)setError("This archive could not be reviewed. No restore was requested. Refresh history or choose another archive.");}
    finally{gate.current=false;if(live.current)setBusy(false);}
  }
  async function execute(){
    if(gate.current||!selected||!ready||unresolved||disabled||selected.status!=="reviewed"||confirmation!==confirmationText||Date.parse(selected.expiresAt)<=Date.now())return;
    gate.current=true;setBusy(true);setError("");
    try{remember(await executeWebsiteRestore(selected.id,{confirmation:confirmationText},{signal:AbortSignal.timeout(35000)}));}
    catch{if(live.current){setReady(false);setConfirmation("");setError("The restore response was not confirmed. Refresh restore history, then check its outcome. Do not start another restore.");}}
    finally{gate.current=false;if(live.current)setBusy(false);}
  }
  async function reconcile(row:Operation){
    if(gate.current)return;gate.current=true;setBusy(true);setError("");
    try{remember(await reconcileWebsiteRestore(row.id,{}, {signal:AbortSignal.timeout(30000)}));}
    catch{if(live.current)setError("The outcome is still unverified. The restore remains blocked. Try checking again; contact your deployment operator if verification remains unavailable.");}
    finally{gate.current=false;if(live.current)setBusy(false);}
  }
  useEffect(()=>{live.current=true;void refresh();const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{live.current=false;clearInterval(timer);};},[]);
  return <section className="backup-panel backup-restore" aria-busy={busy}>
    <h3><RotateCcw color="#b45309" aria-hidden="true"/> Restore website database</h3>
    <p>A restore replaces website database content with the selected archive. Changes made since that backup will be lost. Media files are not restored. Create and verify a current backup before proceeding.</p>
    <div className="backup-toolbar"><button disabled={busy} onClick={()=>void refresh()}>Refresh restore history</button></div>
    {error&&<p role="alert" className="backup-warning">{error}</p>}
    {unresolved&&<p role="status">An earlier restore needs outcome verification. New restores remain blocked.</p>}
    <label htmlFor="restore-archive">Choose an archive to review</label>
    <select id="restore-archive" value="" disabled={busy||disabled||!ready||unresolved||!backups.length} onChange={event=>void review(event.target.value)}>
      <option value="">Select backup…</option>{backups.map(backup=><option key={backup.key} value={backup.key}>{scheduleDateTime(backup.createdAt)} Eastern</option>)}
    </select>
    {selected&&<div className="restore-review" aria-live="polite">
      <h4>{labels[selected.status]}</h4>
      <p>Archive: {scheduleDateTime(selected.summary.createdAt)} Eastern · {selected.summary.tableCount} tables · {selected.summary.totalRowCount.toLocaleString()} rows</p>
      <p>Stack: {selected.summary.clientStackId}</p>
      {selected.status==="reviewed"&&<>
        <p>{Date.parse(selected.expiresAt)<=now?"This review has expired. Select the archive again for a fresh review.":`Review expires ${scheduleDateTime(selected.expiresAt)} Eastern.`}</p>
        <label htmlFor="restore-confirmation">Type {confirmationText} to confirm replacement</label>
        <input id="restore-confirmation" autoComplete="off" spellCheck={false} value={confirmation} disabled={busy||!ready||unresolved||disabled} onChange={event=>setConfirmation(event.target.value)}/>
        <button className="restore-destructive" disabled={busy||!ready||disabled||unresolved||confirmation!==confirmationText||Date.parse(selected.expiresAt)<=now} onClick={()=>void execute()}>Restore selected backup</button>
      </>}
      {["running","uncertain"].includes(selected.status)&&<p>Check the recorded outcome before taking further action. An unknown outcome does not mean the restore failed.</p>}
      {selected.status==="not_applied"&&<p>No restore committed for this operation. Select an archive for a new review if another attempt is needed.</p>}
    </div>}
    <h4>Your recent restore operations</h4>
    {history.length?<ul className="restore-history">{history.map(row=><li key={row.id}>
      <div><strong>{labels[row.status]}</strong><p>{scheduleDateTime(row.createdAt)} Eastern · Archive {scheduleDateTime(row.summary.createdAt)}</p><small>Operation {row.id}</small></div>
      {["running","uncertain"].includes(row.status)?<button disabled={busy} onClick={()=>void reconcile(row)}>Check outcome</button>:row.status==="reviewed"?<button disabled={busy||!ready||unresolved} onClick={()=>{setSelected(row);setConfirmation("");}}>Open review</button>:null}
    </li>)}</ul>:ready?<p>No restore operations have been recorded for your account.</p>:<p>Restore history has not loaded.</p>}
  </section>;
}
