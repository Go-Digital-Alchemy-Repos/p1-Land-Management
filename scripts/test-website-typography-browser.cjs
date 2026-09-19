const {chromium}=require(process.cwd()+"/platform/p1-core/node_modules/@playwright/test");
const assert=require("node:assert/strict");
(async()=>{const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on("pageerror",e=>errors.push(e.message));let discard=false;page.on("dialog",d=>discard?d.accept():d.dismiss());
 let state={fonts:{frontend_body_font:"legacy-font",frontend_heading_font:"inter"},options:[{value:"inter",label:"Inter",category:"sans"},{value:"lora",label:"Lora",category:"serif"}],version:"a".repeat(64)};
 let allowed=true,failRead=true,stale=true,lost=false;const writes=[];
 await page.route("https://www.p1landmanagement.com/cms-preview/typography**",route=>route.fulfill({contentType:"text/html",body:"<!doctype html><html><body><h1>Synthetic isolated font preview</h1></body></html>"}));
 await page.route("**/api/**",async route=>{const path=new URL(route.request().url()).pathname;let json=[];
  if(path==="/api/v1/setup")json={initialized:true,configured:true};
  if(path==="/api/v1/me")json={id:"member",name:"Colleague",role:"member",capabilities:allowed?["marketing.design.typography","settings.preferences"]:["marketing.design.colors","settings.preferences"],mfaRequired:false};
  if(path==="/api/v1/workspace/references")json={clients:[],properties:[],staff:[]};
  if(path.endsWith("/design/typography")){
   if(route.request().method()==="PUT"){
    const body=route.request().postDataJSON();writes.push(body);if(stale){stale=false;state.version="b".repeat(64);return route.fulfill({status:409,json:{error:"Changed"}});}
    state={...state,fonts:{...state.fonts,...body.fonts},version:"c".repeat(64)};if(lost){lost=false;return route.abort();}json={saved:true};
   }else{if(failRead){failRead=false;return route.fulfill({status:503,json:{error:"Unavailable"}});}json=state;}
  }return route.fulfill({json});
 });
 await page.goto("http://127.0.0.1:4347/marketing/design/typography");await page.getByRole("alert").filter({hasText:"Could not load"}).waitFor();assert(await page.getByRole("button",{name:"Save Typography"}).isDisabled());
 const reload=page.getByRole("button",{name:"Reload saved fonts",exact:true});await reload.click();
 const body=page.getByLabel("Body Font",{exact:true}),heading=page.getByLabel("Heading Font",{exact:true}),save=page.getByRole("button",{name:"Save Typography",exact:true});
 await body.waitFor();assert.equal(await body.inputValue(),"legacy-font");await heading.selectOption("lora");assert.equal(writes.length,0);const frame=page.getByTitle("Unsaved website typography specimen");assert.equal(await frame.getAttribute("sandbox"),"");assert.equal(await frame.getAttribute("referrerpolicy"),"no-referrer");assert.equal(new URL(await frame.getAttribute("src")).searchParams.get("heading"),"Lora");await page.getByRole("button",{name:"Narrow sample",exact:true}).click();assert.equal(writes.length,0);await page.getByRole("button",{name:"Reload font preview",exact:true}).click();assert.equal(writes.length,0);await save.click();await page.getByRole("alert").filter({hasText:"could not be confirmed"}).waitFor();assert.equal(await heading.inputValue(),"lora");assert(await save.isDisabled());assert.deepEqual(writes[0],{fonts:{frontend_heading_font:"lora"},expectedVersion:"a".repeat(64)});
 await reload.click();assert.equal(await heading.inputValue(),"lora");discard=true;failRead=true;await reload.click();await page.getByRole("alert").filter({hasText:"Could not load"}).waitFor();assert.equal(await heading.inputValue(),"lora");await reload.click();await page.waitForFunction(()=>document.querySelector("#frontend_heading_font")?.value==="inter");
 await heading.selectOption("lora");lost=true;await save.click();await page.getByRole("alert").filter({hasText:"could not be confirmed"}).waitFor();await reload.click();await page.waitForFunction(()=>document.querySelector("#frontend_heading_font")?.value==="lora");
 assert.equal(await body.inputValue(),"legacy-font");await body.selectOption("");await save.click();await page.getByRole("status").filter({hasText:"Website fonts saved"}).waitFor();assert.deepEqual(writes.at(-1).fonts,{frontend_body_font:""});
 assert.equal(await page.getByRole("link",{name:"Preview the saved website"}).getAttribute("href"),"https://www.p1landmanagement.com/?cmsPreview=1");
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:"/tmp/p1-typography-mobile.png"});
 allowed=false;await page.reload();await page.getByRole("region",{name:"Website typography"}).waitFor({state:"hidden"});assert.deepEqual(errors,[]);console.log("Typography browser passed: specific grant, custom preservation, partial writes, stale/failed reload/lost response recovery, defaults, isolated unsaved preview and mobile.");
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
