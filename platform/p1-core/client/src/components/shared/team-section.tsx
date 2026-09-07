import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SectionHeading } from "@/features/admin/cms/builder/section-heading";
import { selectTeamMembers, teamBioExcerpt, type PublicTeamMember } from "@shared/team";

export function TeamSection({ props }: { props: Record<string, unknown> }) {
  const {
    data: members = [],
    isLoading,
    isError,
  } = useQuery<PublicTeamMember[]>({ queryKey: ["/api/cms/team"] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = selectTeamMembers(members, props.memberIds);
  const selected = visible.find((member) => member.id === selectedId);
  const layout = ["portraits", "cards", "horizontal"].includes(String(props.layout))
    ? String(props.layout)
    : "portraits";
  const columns =
    String(props.columns) === "2"
      ? "md:grid-cols-2"
      : String(props.columns) === "4"
        ? "md:grid-cols-2 lg:grid-cols-4"
        : "md:grid-cols-2 lg:grid-cols-3";
  if (isLoading)
    return (
      <p role="status" className="p-6 text-center text-muted-foreground">
        Loading team…
      </p>
    );
  if (isError)
    return (
      <p role="status" className="p-6 text-center text-muted-foreground">
        Team information is temporarily unavailable.
      </p>
    );
  if (!visible.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8" data-testid="team-section">
      <SectionHeading props={props} defaultAlignment="center" className="mb-10" />
      <div className={`grid gap-8 ${layout === "horizontal" ? "lg:grid-cols-2" : columns}`}>
        {visible.map((member) => (
          <article
            key={member.id}
            className={`min-w-0 ${layout === "cards" ? "rounded-xl border bg-card p-5 shadow-sm" : ""} ${layout === "horizontal" ? "flex items-start gap-5" : ""}`}
          >
            <button
              type="button"
              onClick={() => setSelectedId(member.id)}
              aria-label={`Read biography of ${member.name}`}
              className={`group block overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 ${layout === "horizontal" ? "w-28 shrink-0 sm:w-40" : "w-full"}`}
            >
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.photoAlt || member.name}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center">
                  <Users aria-hidden="true" className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </button>
            <div className={`min-w-0 ${layout === "horizontal" ? "" : "pt-4"}`}>
              <h3 className="break-words font-heading text-xl font-semibold">
                <button
                  type="button"
                  className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => setSelectedId(member.id)}
                >
                  {member.name}
                </button>
              </h3>
              {props.showRole !== false && member.role && (
                <p className="mt-1 break-words text-sm text-muted-foreground">{member.role}</p>
              )}
              {props.showExcerpt !== false && (
                <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">
                  {teamBioExcerpt(member, Number(props.excerptLength ?? 180))}
                </p>
              )}
              <button
                type="button"
                className="mt-4 text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setSelectedId(member.id)}
                aria-label={`Read more about ${member.name}`}
              >
                Read bio
              </button>
            </div>
          </article>
        ))}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">{selected.name}</DialogTitle>
                <DialogDescription>{selected.role || "Team member biography"}</DialogDescription>
              </DialogHeader>
              {selected.photoUrl && (
                <img
                  src={selected.photoUrl}
                  alt={selected.photoAlt || selected.name}
                  className="max-h-80 w-full rounded-lg object-contain"
                />
              )}
              {/<[a-z][\s\S]*>/i.test(selected.biography) ? (
                <div
                  className="prose prose-sm max-w-none break-words dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: selected.biography }}
                />
              ) : (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {selected.biography || selected.excerpt || "Biography coming soon."}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
