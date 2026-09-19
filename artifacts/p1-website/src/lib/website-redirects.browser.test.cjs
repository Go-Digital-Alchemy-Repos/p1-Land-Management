// Run against a local website Vite server (PORT=4359), with API/network fully intercepted.
const {chromium}=require(require('node:path').resolve(__dirname,'../../../../platform/p1-core/node_modules/@playwright/test'));
const assert=require('node:assert/strict');
const origin = new URL(process.env.WEBSITE_TEST_ORIGIN || 'http://127.0.0.1:4359');
if (!['127.0.0.1','localhost','[::1]'].includes(origin.hostname) ||
    !['http:','https:'].includes(origin.protocol) || origin.username || origin.password ||
    origin.pathname !== '/' || origin.search || origin.hash) {
  throw Error('WEBSITE_TEST_ORIGIN must be a loopback HTTP(S) origin');
}
const fixtureOrigin = origin.origin;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
(async()=>{
const browser=await chromium.launch({headless:true,...(executablePath ? {executablePath} : {})});
try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let failing=false;let reads=0;let delay=0;let ruleSource='/about';let navigations=[];
page.on('request',request=>{if(request.isNavigationRequest())navigations.push(request.url());});
await page.route('**/*',route=>new URL(route.request().url()).origin===fixtureOrigin?route.continue():route.abort());
await page.route('**/api/**',async route=>{
if(new URL(route.request().url()).pathname==='/api/p1/website-redirects'){
reads++;if(delay)await new Promise(r=>setTimeout(r,delay));
if(failing)return route.fulfill({status:503,json:{error:'unavailable'}});
return route.fulfill({json:{schemaVersion:1,stackId:'p1-land-management',version:'a'.repeat(64),redirects:[{fromPath:ruleSource,toPath:'/contact',statusCode:301}]}});
}return route.fulfill({status:404,json:{error:'fixture has no content override'}});
});
await page.goto(fixtureOrigin+'/');
await page.locator('a[href="/about"]').first().click();
await page.waitForURL('**/contact');
await page.locator('h1').first().waitFor();assert(navigations.some(url=>url.endsWith('/contact')));assert(reads>0);
await page.goto(fixtureOrigin+'/');
await page.evaluate(()=>history.pushState(null,'','/about?utm_source=qa&x=%2F'));
await page.waitForURL('**/contact?utm_source=qa&x=%2F');
failing=true;
await page.evaluate(()=>history.pushState(null,'','/services'));
await page.waitForFunction(()=>location.pathname==='/services'&&!document.querySelector('main[role="status"]'));
assert.equal(new URL(page.url()).pathname,'/services');
failing=false;delay=300;
await page.evaluate(()=>history.pushState(null,'','/about'));
await page.evaluate(()=>history.pushState(null,'','/services?latest=1'));
await page.waitForTimeout(500);assert.equal(new URL(page.url()).pathname,'/services');
// Native fetch abort must release the guard even when the upstream never answers.
delay=3000;
await page.evaluate(()=>history.pushState(null,'','/about'));
await page.waitForFunction(()=>location.pathname==='/about'&&!document.querySelector('main[role="status"]'));
assert.equal(new URL(page.url()).pathname,'/about');
await page.waitForTimeout(1000);
assert.deepEqual(errors,[]);console.log('PASS: real Wouter link redirects via document navigation; browser queries preserved; failure releases loading; stale navigation check ignored.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
