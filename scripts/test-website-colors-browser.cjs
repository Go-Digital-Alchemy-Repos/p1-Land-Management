const {chromium}=require(process.cwd()+"/platform/p1-core/node_modules/@playwright/test");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  let discard=false;page.on("dialog",d=>discard?d.accept():d.dismiss());
  const keys=["brand_primary_color","brand_secondary_color","brand_tertiary_color","brand_quaternary_color","text_h1_color","text_h2_color","text_h3_h6_color","text_body_color","text_heading_subtext_color","text_supporting_copy_color","text_helper_text_color","text_meta_color","text_link_color","text_link_hover_color","text_inverse_color","text_primary_foreground_color","text_secondary_foreground_color","text_tertiary_foreground_color"];
  let state={colors:{...Object.fromEntries(keys.map(k=>[k,""])),brand_primary_color:"legacy custom value"},version:"a".repeat(64)};
  let allowed=true,failRead=true,stale=true,lost=false;
  const writes=[];
  await page.route("**/api/**",async route=>{
   const path=new URL(route.request().url()).pathname;let json=[];
   if(path==="/api/v1/setup")json={initialized:true,configured:true};
   if(path==="/api/v1/me")json={id:"member",name:"Colleague",role:"member",capabilities:allowed?["marketing.design.colors","settings.preferences"]:["marketing.design.branding","settings.preferences"],mfaRequired:false};
   if(path==="/api/v1/workspace/references")json={clients:[],properties:[],staff:[]};
   if(path.endsWith("/design/colors")){
    if(route.request().method()==="PUT"){
     const body=route.request().postDataJSON();writes.push(body);
     if(stale){stale=false;state.version="b".repeat(64);return route.fulfill({status:409,json:{error:"Changed"}});}
     state={colors:{...state.colors,...body.colors},version:"c".repeat(64)};
     if(lost){lost=false;return route.abort();}
     json={saved:true};
    }else{if(failRead){failRead=false;return route.fulfill({status:503,json:{error:"Unavailable"}});}json=state;}
   }
   return route.fulfill({json});
  });
  await page.goto("http://127.0.0.1:4347/marketing/design/colors");
  await page.getByRole("alert").filter({hasText:"Could not load"}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Save website colors"}).count(),0);
  const reload=page.getByRole("button",{name:"Reload saved colors",exact:true});await reload.click();
  const primary=page.getByLabel("Primary",{exact:true}),body=page.getByLabel("Body text",{exact:true}),save=page.getByRole("button",{name:"Save website colors",exact:true});
  await primary.waitFor();assert.equal(await primary.inputValue(),"legacy custom value");
  await body.fill("red");assert(await save.isDisabled());await body.fill("#123456");await save.click();
  await page.getByRole("alert").filter({hasText:"could not be confirmed"}).waitFor();assert.equal(await body.inputValue(),"#123456");assert(await save.isDisabled());
  assert.deepEqual(writes[0],{colors:{text_body_color:"#123456"},expectedVersion:"a".repeat(64)});
  await reload.click();assert.equal(await body.inputValue(),"#123456");
  discard=true;failRead=true;await reload.click();await page.getByRole("alert").filter({hasText:"Could not load"}).waitFor();assert.equal(await body.inputValue(),"#123456");
  await reload.click();await page.waitForFunction(()=>document.querySelector('#text_body_color')?.value==="");
  await body.fill("#abcdef");lost=true;await save.click();await page.getByRole("alert").filter({hasText:"could not be confirmed"}).waitFor();
  await reload.click();await page.waitForFunction(()=>document.querySelector('#text_body_color')?.value==="#abcdef");assert.equal(await primary.inputValue(),"legacy custom value");
  await primary.fill("#112233");await save.click();await page.getByRole("status").filter({hasText:"Website colors saved"}).waitFor();assert.deepEqual(writes.at(-1).colors,{brand_primary_color:"#112233"});
  await primary.fill("");await save.click();await page.getByRole("status").filter({hasText:"Website colors saved"}).waitFor();assert.deepEqual(writes.at(-1).colors,{brand_primary_color:""});
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector(".sidebar").getBoundingClientRect().right<=0);await page.evaluate(()=>window.scrollTo(0,0));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  assert.equal(await page.getByRole("heading",{name:"Main heading",exact:true}).evaluate(e=>getComputedStyle(e).color),"rgb(171, 205, 239)");
  await page.screenshot({path:"/tmp/p1-website-colors-mobile.png"});
  allowed=false;await page.reload();await page.getByRole("heading",{name:"Website color palette",exact:true}).waitFor({state:"hidden"});
  assert.deepEqual(errors,[]);
  console.log("Website colors browser passed: grant visibility, raw preservation, changed-only saves, validation, stale/reload/lost-response recovery, clearing and mobile containment.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
