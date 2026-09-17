const {chromium}=require(process.cwd()+"/platform/p1-core/node_modules/@playwright/test");
const assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/**",route=>{
   const path=new URL(route.request().url()).pathname;
   let json=[];
   if(path==='/api/v1/setup')json={initialized:true,configured:true};
   if(path==='/api/v1/me')json={id:'synthetic',name:'Operations staff',role:'member',capabilities:['operations.recurring'],mfaRequired:false};
   if(path==='/api/v1/workspace/references')json={clients:[],properties:[],staff:[]};
   if(path==='/api/v1/recurring-jobs')json=[
    {id:'exhausted',title:'Storm assessments',client_name:'Synthetic client',property_name:'Synthetic property',agreement_status:'active',cadence:'weekly',paused:false,generation_status:'Visit allowance exhausted',visit_allowance:3,visits_reserved:3,visits_remaining:0},
    {id:'ready',title:'Grounds inspection',client_name:'Synthetic client',property_name:'Synthetic property',agreement_status:'active',cadence:'weekly',paused:false,generation_status:'Authorized for next visit',visit_allowance:5,visits_reserved:2,visits_remaining:3},
    {id:'legacy',title:'Historical service',client_name:'Synthetic client',property_name:'Synthetic property',cadence:'monthly',paused:false,generation_status:'Legacy schedule',visit_allowance:null,visits_reserved:null,visits_remaining:null},
   ];
   return route.fulfill({json});
  });
  await page.goto('http://127.0.0.1:4347/recurring');
  await page.getByText('Visit allowance exhausted',{exact:true}).waitFor();
  await page.getByText('Authorized for next visit',{exact:true}).waitFor();
  await page.getByText('Legacy schedule',{exact:true}).waitFor();
  const row=page.getByRole('row').filter({hasText:'Storm assessments'});
  assert.equal(await row.getByRole('cell',{name:'0',exact:true}).count(),1);
  assert.equal(await row.getByRole('cell',{name:'3',exact:true}).count(),2);
  await page.getByText('Visit allowances include reserved work',{exact:false}).waitFor();
  await page.screenshot({path:'/tmp/p1-recurring-allowance-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/p1-recurring-allowance-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Recurring allowance table passed: exhausted/available/legacy states, exact counts and mobile containment.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
