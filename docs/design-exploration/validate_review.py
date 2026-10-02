"""Read-only integrity checks for the isolated design review."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse,unquote
import json,hashlib
D=Path(__file__).resolve().parent
ROOT=D.parents[1]
class Links(HTMLParser):
 def __init__(self):super().__init__();self.base=None;self.refs=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='base':self.base=a.get('href')
  elif tag in ('a','link','img'):
   if a.get('href') or a.get('src'):self.refs.append(a.get('href') or a.get('src'))
errors=[];count=0
for p in (D/'mockups').rglob('*.html'):
 parser=Links();parser.feed(p.read_text());base=urljoin(p.as_uri(),parser.base or '')
 for ref in parser.refs:
  u=urlparse(urljoin(base,ref));count+=1
  if u.scheme=='file' and not Path(unquote(u.path)).exists():errors.append({'file':str(p.relative_to(D)),'reference':ref})
source=json.loads((D/'evidence/source-pages.json').read_text())
changed=[r['file'] for r in source if hashlib.sha256((ROOT/r['file']).read_bytes()).hexdigest()!=r['sha256']]
qa=json.loads((D/'evidence/mockup-browser-checks.json').read_text())
fail=[r for r in qa if r['scroll']>r['width'] or r['h1']!=1 or r['broken']]
result={'html_files':len(list((D/'mockups').rglob('*.html'))),'references_checked':count,'missing_targets':errors,'source_hashes_checked':len(source),'changed_source_files':changed,'browser_checks':len(qa),'browser_failures':fail}
(D/'evidence/integrity-validation.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
raise SystemExit(bool(errors or changed or fail))
