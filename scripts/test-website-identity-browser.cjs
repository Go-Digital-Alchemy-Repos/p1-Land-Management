const {chromium}=require(process.cwd()+"/platform/p1-core/node_modules/@playwright/test");
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));let discard=false;page.on('dialog',d=>discard?d.accept():d.dismiss());
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 let state={settings:{company_name:'Old name',company_address:'Street\nCity',company_phone_numbers:'123',company_google_business_url:'',frontend_logo_url:'legacy relative logo',favicon_url:''},version:'a'.repeat(64)};
 let allowed=true,failRead=true,stale=true,lost=false,uploads=0;const writes=[];
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let json=[];
 if(path==='/api/v1/setup')json={initialized:true,configured:true};
 if(path==='/api/v1/me')json={id:'member',name:'Colleague',role:'member',capabilities:allowed?['marketing.design.branding','settings.preferences']:['marketing.design.colors','settings.preferences'],mfaRequired:false};
 if(path==='/api/v1/workspace/references')json={clients:[],properties:[],staff:[]};
 if(path.endsWith('/design/branding/assets')){uploads++;assert.match(route.request().headers()['content-type'],/multipart\/form-data/);return route.fulfill({status:201,json:{url:'https://example.test/logo.webp',mediaId:'asset'}});}
 if(path.endsWith('/design/branding')){
 if(route.request().method()==='PUT'){const body=route.request().postDataJSON();writes.push(body);if(stale){stale=false;state.version='b'.repeat(64);return route.fulfill({status:409,json:{error:'Changed'}});}state={settings:{...state.settings,...body.settings},version:'c'.repeat(64)};if(lost){lost=false;return route.abort();}json={saved:true};}
 else{if(failRead){failRead=false;return route.fulfill({status:503,json:{error:'Unavailable'}});}json=state;}}
 return route.fulfill({json});});
 await page.goto('http://127.0.0.1:4347/marketing/design/branding');await page.getByRole('alert').filter({hasText:'Could not load'}).waitFor();
 const reload=page.getByRole('button',{name:'Reload saved branding settings',exact:true});await reload.click();const name=page.getByLabel('Company name',{exact:true}),logo=page.getByLabel('Website logo URL',{exact:true}),save=page.getByRole('button',{name:'Save branding settings',exact:true});
 await name.fill('New name');await save.click();await page.getByRole('alert').waitFor();assert.equal(await name.inputValue(),'New name');assert(await save.isDisabled());
 discard=true;failRead=true;await reload.click();await page.getByRole('alert').filter({hasText:'Could not load'}).waitFor();assert.equal(await name.inputValue(),'New name');await reload.click();await page.waitForFunction(()=>document.querySelector('#company_name')?.value==='Old name');
 await name.fill('New name');lost=true;await save.click();await page.getByRole('alert').filter({hasText:'could not be confirmed'}).waitFor();await reload.click();await page.waitForFunction(()=>document.querySelector('#company_name')?.value==='New name');assert.deepEqual(writes.at(-1).settings,{company_name:'New name'});assert.equal(await logo.inputValue(),'legacy relative logo');
 await logo.fill('javascript:bad()');assert(await save.isDisabled());await logo.fill('');await save.click();await page.getByRole('status').filter({hasText:'Branding settings saved'}).waitFor();assert.deepEqual(writes.at(-1).settings,{frontend_logo_url:''});
 const before=writes.length;await page.getByLabel('Upload logo',{exact:true}).setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from('fixture')});await page.getByRole('status').filter({hasText:'Image uploaded'}).waitFor();assert.equal(uploads,1);assert.equal(writes.length,before);assert.equal(await logo.inputValue(),'https://example.test/logo.webp');await save.click();await page.getByRole('status').filter({hasText:'Branding settings saved'}).waitFor();assert.deepEqual(writes.at(-1).settings,{frontend_logo_url:'https://example.test/logo.webp'});
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/p1-identity-mobile.png'});
 allowed=false;await page.reload();await page.getByRole('region',{name:'Website branding'}).waitFor({state:'hidden'});assert.deepEqual(errors,[]);console.log('Identity browser passed: leaf grant, legacy preservation, partial saves, stale/read/lost-response recovery, safe URLs, upload-before-apply, clearing and mobile containment.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
