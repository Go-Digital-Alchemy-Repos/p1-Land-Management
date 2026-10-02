"""Build isolated Concept 3 screens from captured live P1 content; no production writes."""
from pathlib import Path
import json,re,html,shutil,hashlib
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
CONTENT=json.loads((D/'evidence/live-content.json').read_text())
ASSETS=ROOT/'artifacts/p1-website/src/assets/optimized'
ROUTES={v['url'].split('p1landmanagement.com')[-1] or '/':k+'.html' for k,v in CONTENT.items()}
LABELS={'home':'Homepage','services':'Services','drainage':'Drainage','grading':'Grading & site prep','commercial':'Commercial','about':'About P1','contact':'Contact'}
VOID={'img','input','br','hr'}
def walk(n):
 yield n
 for c in n.get('children',[]):yield from walk(c)
def text(n):return n.get('text','')+''.join(text(c) for c in n.get('children',[]))
def find(n,tag):return [c for c in walk(n) if c['tag']==tag]
def href(v):
 route=v.replace('https://www.p1landmanagement.com','')
 return ROUTES.get(route,'https://www.p1landmanagement.com'+v if v.startswith('/') else v)
def image(v):
 filename=Path(v).name;stem=re.sub(r'-\d+-[^.]+\.webp$','-1280.webp',filename)
 matches=list(ASSETS.rglob(stem))
 if matches:
  target=D/'assets'/stem
  if not target.exists():shutil.copyfile(matches[0],target)
  return 'assets/'+stem
 return 'https://www.p1landmanagement.com'+v if v.startswith('/') else v
records={}
def render(n,depth=0):
 tag=n['tag'];classes=n.get('classes','');a=n.get('attrs',{}).copy()
 if tag=='#text':return '' if n['text'].strip()=='Preparing verification...' else html.escape(n['text'])
 if a.get('aria-label')=='Form verification':return ''
 if tag in ['script','svg','path','style','iframe'] or 'hidden' in classes.split() or 'sr-only' in classes.split():return ''
 if tag=='button' and (a.get('aria-label','').startswith(('Previous','Next','Show slide','Play automatic','Pause automatic'))):return ''
 if tag=='img':
  if a.get('alt')=='P1 Land & Property Management':return '<img src="assets/p1-original-logo.svg" alt="P1 Land & Property Management">'
  a['src']=image(a.get('src',''));a['loading']='eager';a.pop('id',None)
  return '<figure class="picture"><img '+attrs(a)+'><figcaption>Illustrative imagery · not a completed P1 project</figcaption></figure>'
 if tag=='a':
  a['href']=href(a.get('href','#'));a.pop('id',None)
  if any(i.get('attrs',{}).get('alt')=='P1 Land & Property Management' for i in find(n,'img')):a['class']='brand'
  elif find(n,'h3') and find(n,'img'):a['class']='service-card'
  elif any(t in classes for t in ['bg-primary','bg-clay']):a['class']='button'
 if tag in ['div','ul','ol']:
  roles=[]
  if 'grid' in classes.split():
   nums=[int(x) for x in re.findall(r'(?:[a-z]+:)?grid-cols-(\d+)',classes)]
   num=max(nums or [2]);roles.append('layout-grid');a['data-cols']=str(2 if num==12 else min(num,4))
  if any(t in classes for t in ['space-y-16','space-y-20']):roles.append('content-stack')
  if 'site-shell' in classes:roles.append('container')
  if 'flex-row' in classes and not find(n,'input'):roles.append('section-heading')
  if 'overflow-x-auto' in classes:roles.append('review-strip')
  if 'col-span' in classes:roles.append('column')
  if roles:a['class']=' '.join(roles)
 if tag=='span' and ('uppercase' in classes or 'tracking-' in classes):a['class']='eyebrow'
 if tag=='p' and 'uppercase' in classes:a['class']='eyebrow'
 if tag=='label':a['class']='field-label'
 if tag=='input' and a.get('type')=='radio':a['class']='radio-input'
 if tag=='button':a['type']='button' if a.get('type')!='submit' else 'submit';a['class']='button'
 if tag=='form':
  a={'class':'inquiry-form','onsubmit':"event.preventDefault();this.querySelector('[role=status]').textContent='Mockup preview only. Nothing was sent to P1.'"}
 if tag=='article':a['class']='review-card'
 children=''.join(render(c,depth+1) for c in n.get('children',[]))
 if tag=='form':children+='<p role="status" class="preview-status" aria-live="polite"></p>'
 if tag=='div' and not children.strip():return ''
 if tag=='section':a={'class':'content-section'}
 return '<'+tag+(' '+attrs(a) if a else '')+'>'+('' if tag in VOID else children+'</'+tag+'>')
def attrs(a):return ' '.join(html.escape(k)+'="'+html.escape(str(v),quote=True)+'"' for k,v in a.items())
def nav():
 return '<header class="site-header container"><a class="brand" href="home.html"><img src="assets/p1-original-logo.svg" alt="P1 Land & Property Management"></a><nav aria-label="Main navigation"><a href="home.html">Home</a><a href="about.html">About</a><details class="services-menu"><summary>Services</summary><div class="menu-panel">'+''.join('<a href="'+k+'.html">'+LABELS[k]+'</a>' for k in ['services','drainage','grading','commercial'])+'<a href="https://www.p1landmanagement.com/gallery">Service Gallery</a><a href="https://www.p1landmanagement.com/service-areas">Service Areas</a></div></details><a href="contact.html">Contact</a></nav><div class="header-actions"><a class="phone" href="tel:+17042218928">(704) 221-8928</a><a class="button" href="contact.html">Request a Site Visit</a></div><details class="mobile-menu"><summary>Menu</summary><div class="menu-panel">'+''.join('<a href="'+k+'.html">'+LABELS[k]+'</a>' for k in LABELS)+'<a href="tel:+17042218928">Call (704) 221-8928</a></div></details></header>'
def hero(key,n):
 title=find(n,'h1')[0];ps=find(n,'p');heading=render(title);description=''.join(render(p) for p in ps)
 links=[a for a in find(n,'a') if text(a).strip()]
 primary=[];index=[]
 for a in links:
  if text(a).strip().startswith(('01','02','03','04','05')):index.append(a)
  else:primary.append(a)
 actions='<div class="hero-actions">'+''.join(render(a) for a in primary)+'</div>'
 ims=find(n,'img');src=image(ims[0]['attrs']['src']) if ims else image('/assets/hero-bg-1280-CsM162Zk.webp')
 if key=='grading':src='assets/carolina-grading-illustration.png'
 label='The Land Specialists' if key=='home' else LABELS[key]
 if key=='contact':return '<section class="contact-hero container"><span class="eyebrow">P1 Land & Property Management</span>'+heading+description+'</section>'
 return '<section class="hero '+key+'"><img class="hero-image" src="'+src+'" alt="Illustrative '+LABELS[key].lower()+' scene"><div class="hero-shade"></div><div class="hero-copy container"><span class="eyebrow">'+label+'</span>'+heading+description+actions+'</div><small class="media-label">Illustrative imagery · not a completed P1 project</small></section>'+ ('<div class="work-index container">'+''.join(render(a) for a in index)+'</div>' if index else '')
head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="style.css">'
for key,page in CONTENT.items():
 sections=[n for n in page['main']['children'] if n['tag']!='#text'];body=hero(key,sections[0])
 for i,n in enumerate(sections[1:],1):
  if find(n,'h2') and text(find(n,'h2')[0]).strip()=="Let's Walk Your Property":
   body+='<section class="closing-cta"><div class="container"><span class="eyebrow">P1 Land & Property Management</span>'+''.join(render(x) for x in find(n,'h2')+find(n,'p'))+'<div class="hero-actions">'+''.join(render(x) for x in find(n,'a'))+'</div></div></section>'
   continue
  body+=render(n).replace('class="content-section"','class="content-section section-'+str(i)+'"',1)
 footer=render(page['footer']) if page['footer'] else ''
 # Use the original vector, without filters or generated substitutes, everywhere.
 footer=re.sub(r'<figure class="picture"><img ([^>]*alt="P1 Land &amp; Property Management"[^>]*)>.*?</figure>','<a class="brand" href="home.html"><img src="assets/p1-original-logo.svg" alt="P1 Land & Property Management"></a>',footer)
 review='<div class="review-bar"><span>Concept 3 · P1 original logo + current content · MOCKUP ONLY</span><a href="index.html">All seven pages →</a></div>'
 document='<!doctype html><html lang="en"><head>'+head+'<title>P1 · Concept 3 · '+LABELS[key]+'</title></head><body class="page-'+key+'">'+review+'<a class="skip" href="#main">Skip to content</a>'+nav()+'<main id="main">'+body+'</main>'+footer+'<div class="mobile-actions"><a href="tel:+17042218928">Call P1</a><a href="contact.html">Request a Site Visit</a></div></body></html>'
 (D/(key+'.html')).write_text(document)
 # Copy verification uses substantive text blocks, not carousel-control labels or icon accessibility text.
 records[key]={'source':page['url'],'passages':[re.sub(r'\s+',' ',text(n)).strip() for n in walk(page['main']) if n['tag'] in ['h1','h2','h3','p','li','blockquote','label','summary'] and 'sr-only' not in n.get('classes','').split() and text(n).strip() not in ['Leave this empty','Preparing verification…','Preparing verification...'] and len(text(n).strip())>2]}
index='<section class="review-intro container"><span class="eyebrow">Concept 3 · refinement</span><h1>Still P1.<br>A warmer way to see it.</h1><p>The actual green-and-blue logo. Current page content. The landscape-led, linen-and-clay character of Concept 3.</p><p class="review-note">Seven isolated visual mockups. Forms do not send inquiries. Existing public claims are reproduced for content fidelity, not newly verified. Imagery remains illustrative.</p><div class="review-grid">'+''.join('<a href="'+k+'.html"><img src="'+('assets/carolina-grading-illustration.png' if k=='grading' else image(find(CONTENT[k]['main'],'img')[0]['attrs']['src']) if find(CONTENT[k]['main'],'img') else 'assets/hero-bg-1280.webp')+'" alt=""><span>0'+str(i+1)+'</span><h2>'+LABELS[k]+'</h2><p>Open the full page →</p></a>' for i,k in enumerate(CONTENT))+'</div></section>'
(D/'index.html').write_text('<!doctype html><html lang="en"><head>'+head+'<title>P1 · Concept 3 refinement</title></head><body><div class="review-bar">MOCKUP ONLY — NOT IMPLEMENTED</div>'+nav()+'<main>'+index+'</main></body></html>')
(D/'evidence/content-verification-targets.json').write_text(json.dumps(records,indent=2))
print('Built seven Concept 3 pages from captured live content.')
