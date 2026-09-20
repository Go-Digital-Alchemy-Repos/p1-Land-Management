import React from "react";
import {createRoot} from "react-dom/client";
import {PipelineProvider,PipelineSettingsEditor,PipelineStage,usePipelineStages} from "../src/PipelineSettings";
import {defaultPipelineConfig} from "@workspace/api-zod/pipeline-settings";
import "../src/theme.css";
import "../src/style.css";
if(!["localhost","127.0.0.1"].includes(location.hostname))throw Error("Local fixture only");
let saved={revision:0,config:structuredClone(defaultPipelineConfig)};
window.fetch=async(input,init)=>{
  if(!String(input).endsWith('/sales/pipeline-settings'))throw Error('Unexpected fixture request');
  if(init?.method==='PUT'){
    const body=JSON.parse(String(init.body));
    if(body.expectedRevision!==saved.revision)return new Response(JSON.stringify({error:'Conflict'}),{status:409});
    saved={revision:saved.revision+1,config:body.config};
  }
  return new Response(JSON.stringify(saved),{headers:{'content-type':'application/json'}});
};
function StagePreview(){const stages=usePipelineStages();return <section className="panel" style={{padding:20}}><h2>Inquiry stage preview</h2><select aria-label="Preview inquiry stage">{stages.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select><p><PipelineStage value="new"/></p></section>;}
createRoot(document.getElementById('root')!).render(<main style={{padding:24,maxWidth:1200,margin:'auto'}}><h1>Pipeline settings</h1><p>Isolated in-memory acceptance fixture; no provider or production writes.</p><PipelineProvider><PipelineSettingsEditor/><StagePreview/></PipelineProvider></main>);
