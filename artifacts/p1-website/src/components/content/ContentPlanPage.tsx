import source from "@/content/P1_Master_Content_Spec_1.md?raw";
import { siteFacts } from "@/content/site-facts";
import { CredentialsStrip } from "@/components/content/CredentialsStrip";
import { LocalOffice } from "@/components/content/LocalOffice";
import { FaqAccordion, type FaqItem } from "@/components/content/FaqAccordion";
import { FinalCTA, type CtaVariant } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { breadcrumbSchema, faqSchema, localBusinessSchema } from "@/lib/structured-data";
import { Link } from "wouter";

type PlanPage = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  subhead: string;
  body: string;
  faqs: FaqItem[];
  links: { label: string; href: string }[];
  cta: CtaVariant | "none";
};

const field = (block: string, name: string) => block.match(new RegExp(`^\\*\\*${name}:\\*\\*\\s*(.+)$`, "m"))?.[1].trim() ?? "";
const clean = (value: string) => value.replace(/\[\[OPTIONAL:[\s\S]*?\]\]/g, "").replace(/\{\{[^}]+\}\}/g, "").replace(/\*\*/g, "").replace(/`/g, "").replace(/\s+/g, " ").trim();

function faqItems(block: string): FaqItem[] {
  const start = block.search(/^## FAQ\s*$/m);
  if (start < 0) return [];
  const part = block.slice(start).split(/^---\s*$/m)[0];
  return [...part.matchAll(/^\*\*([^*\n]+?)\*\*[ \t]*\n([\s\S]*?)(?=^\*\*[^*\n]+?\*\*[ \t]*\n|^## |$)/gm)]
    .map(([, question, answer]) => ({ question: clean(question), answer: clean(answer.replace(/\n+/g, " ")) }))
    .filter((item) => item.question && item.answer && !item.question.includes(":"));
}

function links(block: string) {
  return [...block.matchAll(/"([^"]+)"\s*→\s*`(\/[^`]+)`/g)].map(([, label, href]) => ({ label, href }));
}

function parsePage(path: string, block: string): PlanPage {
  const beforeFaq = block.split(/^## FAQ\s*$/m)[0];
  const cta = (field(block, "CTA").match(/CTA-(MAINT|SITE|FARM|SNOW|GENERAL)/)?.[1].toLowerCase() ?? field(block, "CTA").toLowerCase()) as CtaVariant | "none";
  return {
    path,
    title: clean(field(block, "Title")),
    description: clean(field(block, "Meta description")),
    eyebrow: clean(field(block, "Eyebrow")) || (path.startsWith("/service-areas") ? "Service area" : "P1 Land & Property Management"),
    h1: clean(field(block, "H1")),
    subhead: clean(field(block, "Hero subhead")),
    body: beforeFaq,
    faqs: faqItems(block),
    links: links(block),
    cta: cta || "general",
  };
}

const pages = new Map<string, PlanPage>();
const starts = [...source.matchAll(/^### .*?`(\/[^`]*)`.*$/gm)];
for (let index = 0; index < starts.length; index += 1) {
  const match = starts[index];
  const path = match[1];
  const end = starts[index + 1]?.index ?? source.length;
  pages.set(path, parsePage(path, source.slice((match.index ?? 0) + match[0].length, end)));
}

export const contentPlanForPath = (path: string) => pages.get(path.replace(/\/$/, "") || "/");

const ctaPagesWithCredentials = new Set(["/", "/about", "/commercial", "/commercial/data-centers-secure-facilities", "/services/commercial-landscaping", "/services/commercial-snow-ice-management", "/contact"]);
const ignored = /^(Title|Meta description|OG title|OG description|Eyebrow|H1|Hero subhead|Hero buttons|Hero stat row|Service cards|Credentials strip|Implementation note|Filter bar|Form|Sidebar|Links|CTA|Commercial callout band|Qualifier|Image file|Card|Heading|Body|Buttons|Primary|Secondary|Line):/i;
const instruction = /^(Replace |Keep |Add |Remove |Apply |Rename |Set |Use |In |For each |Most |Make |All buttons|Render |Blocks |The current |This page |These )/i;

function contentLines(body: string) {
  const lines: string[] = [];
  let optional = false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line.includes("[[OPTIONAL:")) optional = true;
    if (!optional && line && !ignored.test(line.replace(/^\*\*/, "").replace(/\*\*$/, "")) && !instruction.test(line.replace(/^\*\*/, "").replace(/\*\*$/, ""))) lines.push(line);
    if (line.includes("]]")) optional = false;
  }
  return lines;
}

function MarkdownBody({ body }: { body: string }) {
  const lines = contentLines(body);
  const nodes: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^## /.test(line)) { nodes.push(<h2 key={index} className="font-display text-3xl text-secondary">{clean(line.slice(3))}</h2>); index += 1; continue; }
    if (/^### /.test(line)) { nodes.push(<h3 key={index} className="font-serif text-xl font-bold text-secondary">{clean(line.slice(4))}</h3>); index += 1; continue; }
    if (/^\*\*H3:/.test(line)) { nodes.push(<h3 key={index} className="font-serif text-xl font-bold text-secondary">{clean(line.replace(/^\*\*H3:\s*/, "").replace(/\*\*$/, ""))}</h3>); index += 1; continue; }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*] /.test(lines[index])) items.push(clean(lines[index++].slice(2)));
      nodes.push(<ul key={index} className="list-disc space-y-3 pl-6 text-secondary/80">{items.map((item) => <li key={item}>{item}</li>)}</ul>); continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\. /.test(lines[index])) items.push(clean(lines[index++].replace(/^\d+\. /, "")));
      nodes.push(<ol key={index} className="list-decimal space-y-3 pl-6 text-secondary/80">{items.map((item) => <li key={item}>{item}</li>)}</ol>); continue;
    }
    if (line.startsWith("> ")) { nodes.push(<p key={index} className="border-l-4 border-primary pl-5 text-lg italic leading-relaxed text-secondary/80">{clean(line.slice(2))}</p>); index += 1; continue; }
    if (line.startsWith("|")) { index += 1; continue; }
    if (/^\*\*.+\*\*$/.test(line)) { nodes.push(<h3 key={index} className="font-serif text-xl font-bold text-secondary">{clean(line)}</h3>); index += 1; continue; }
    nodes.push(<p key={index} className="max-w-4xl text-lg leading-relaxed text-secondary/80">{clean(line)}</p>); index += 1;
  }
  return <div className="space-y-6">{nodes}</div>;
}

export function ContentPlanPage({ page }: { page: PlanPage }) {
  const crumbs = [{ name: "Home", path: "/" }, ...(page.path === "/" ? [] : [{ name: page.h1 || page.title, path: page.path }])];
  return <>
    <SEO title={page.title} description={page.description} jsonLd={[localBusinessSchema(), breadcrumbSchema(crumbs), ...(page.faqs.length ? [faqSchema(page.faqs)] : [])]} />
    <PageHero eyebrow={page.eyebrow} title={page.h1 || page.title} subtitle={page.subhead} compactMobile />
    <article className="site-shell space-y-12 py-16 md:py-20">
      <MarkdownBody body={page.body} />
      <LocalOffice slug={page.path} />
      {ctaPagesWithCredentials.has(page.path) && <CredentialsStrip />}
      {page.faqs.length > 0 && <section className="space-y-6"><h2 className="font-display text-3xl text-secondary">FAQ: {page.h1 || "P1 Land & Property Management"}</h2><FaqAccordion items={page.faqs} /></section>}
      {page.links.length > 0 && <section data-component="link-module" className="border-t border-border pt-10"><h2 className="font-display text-3xl text-secondary">Explore more</h2><ul className="mt-6 grid gap-4 sm:grid-cols-2">{page.links.map((item) => <li key={`${item.href}-${item.label}`}><Link className="font-bold text-primary underline" href={item.href}>{item.label}</Link></li>)}</ul></section>}
    </article>
    {page.path !== "/contact" && <FinalCTA variant={page.cta === "none" ? "general" : page.cta} />}
  </>;
}
