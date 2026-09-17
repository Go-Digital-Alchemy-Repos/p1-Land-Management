const {chromium}=require(process.cwd()+"/platform/p1-core/node_modules/@playwright/test");
const assert=require("node:assert/strict");
(async()=>{const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on("pageerror",e=>errors.push(e.message));let discard=false;page.on("dialog",d=>discard?d.accept():d.dismiss());
 const names=['facebook','instagram','linkedin','x','tiktok','youtube','pinterest','houzz','yelp','nextdoor'];
 let state={settings:{...Object.fromEntries(names.map(name=>['social_'+name+'_url',''])),social_facebook_url:'legacy unsupported address',social_x_url:'https://example.test/x',social_icon_style:'custom'},version:'a'.repeat(64)};
 let allowed=true,failRead=true,stale=true,lost=false;const writes=[];
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let json=[];
  if(path==='/api/v1/setup')json={initialized:true,configured:true};
  if(path==='/api/v1/me')json={id:'member',name:'Colleague',role:'member',capabilities:allowed?['marketing.design.social-media','settings.preferences']:['marketing.design.colors','settings.preferences'],mfaRequired:false};
  if(path==='/api/v1/workspace/references')json={clients:[],properties:[],staff:[]};
  if(path.endsWith('/design/social-media')){
   if(route.request().method()==='PUT'){const body=route.request().postDataJSON();writes.push(body);if(stale){stale=false;state.version='b'.repeat(64);return route.fulfill({status:409,json:{error:'Changed'}});}state={settings:{...state.settings,...body.settings},version:'c'.repeat(64)};if(lost){lost=false;return route.abort();}json={saved:true};}
   else{if(failRead){failRead=false;return route.fulfill({status:503,json:{error:'Unavailable'}});}json=state;}
  }return route.fulfill({json});
 });
 await page.goto('http://127.0.0.1:4347/marketing/design/social-media');await page.getByRole('alert').filter({hasText:'Could not load'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save social settings'}).count(),0);
 const reload=page.getByRole('button',{name:'Reload saved social settings',exact:true});await reload.click();
 const facebook=page.getByLabel('Facebook URL',{exact:true}),style=page.getByLabel('Icon style',{exact:true}),save=page.getByRole('button',{name:'Save social settings',exact:true}),preview=page.getByRole('region',{name:'Social icon preview'});
 try{await facebook.waitFor();}catch(e){console.error(await page.locator("body").innerText());console.error(errors);throw e;}assert.equal(await facebook.inputValue(),'legacy unsupported address');assert.equal(await style.inputValue(),'custom');assert.equal(await preview.getByRole('link',{name:'Facebook',exact:true}).count(),0);assert.equal(await preview.getByRole('link',{name:'X',exact:true}).locator('svg').count(),1);
 await style.selectOption('outline');await save.click();await page.getByRole('alert').filter({hasText:'could not be confirmed'}).waitFor();assert(await save.isDisabled());assert.deepEqual(writes[0],{settings:{social_icon_style:'outline'},expectedVersion:'a'.repeat(64)});
 await reload.click();assert.equal(await style.inputValue(),'outline');discard=true;failRead=true;await reload.click();await page.getByRole('alert').filter({hasText:'Could not load'}).waitFor();assert.equal(await style.inputValue(),'outline');await reload.click();await page.waitForFunction(()=>document.querySelector('#social-icon-style')?.value==='custom');
 await style.selectOption('outline');lost=true;await save.click();await page.getByRole('alert').filter({hasText:'could not be confirmed'}).waitFor();await reload.click();await page.waitForFunction(()=>document.querySelector('#social-icon-style')?.value==='outline');assert.equal(await facebook.inputValue(),'legacy unsupported address');
 await facebook.fill('javascript:alert(1)');assert(await save.isDisabled());assert.equal(await preview.getByRole('link',{name:'Facebook',exact:true}).count(),0);
 await facebook.fill('https://example.test/facebook');assert.equal(await preview.getByRole('link',{name:'Facebook',exact:true}).getAttribute('rel'),'noopener noreferrer');await save.click();await page.getByRole('status').filter({hasText:'Social settings saved'}).waitFor();assert.deepEqual(writes.at(-1).settings,{social_facebook_url:'https://example.test/facebook'});
 await facebook.fill('');await save.click();await page.getByRole('status').filter({hasText:'Social settings saved'}).waitFor();assert.equal(await preview.getByRole('link',{name:'Facebook',exact:true}).count(),0);
 assert.equal(await page.getByRole("region",{name:"Website social media"}).getByRole("textbox").count(),10);
 for(const value of ['brand','outline','solid']){await style.selectOption(value);assert.equal(await preview.getByRole('link',{name:'X',exact:true}).locator('svg').count(),1);}
 const beforePreview=writes.length;for(const name of names)await page.locator("#social_"+name+"_url").fill("https://example.test/"+name);assert.equal(await preview.getByRole("link").count(),10);assert.equal(await preview.locator("svg").count(),10);assert.equal(writes.length,beforePreview);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await preview.screenshot({path:'/tmp/p1-social-preview-mobile.png'});
 discard=true;allowed=false;await page.reload();await page.getByRole('region',{name:'Website social media'}).waitFor({state:'hidden'});assert.deepEqual(errors,[]);console.log('Social browser passed: leaf grant, all controls, safe SVG preview/styles, preserved legacy values, partial saves, stale/lost-response recovery, clearing and mobile.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
