import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMember } from "@shared/schema";

export function TeamMemberPicker({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const {
    data: members = [],
    isLoading,
    isError,
  } = useQuery<TeamMember[]>({ queryKey: ["/api/admin/cms/team"] });
  const ids = Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string"))]
    : [];
  const move = (index: number, direction: number) => {
    const next = [...ids];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };
  if (isLoading)
    return (
      <p role="status" className="text-sm">
        Loading team members…
      </p>
    );
  if (isError)
    return (
      <p role="alert" className="text-sm">
        Could not load team members. Reopen the editor to retry.
      </p>
    );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Select members, then arrange their display order. Only published members appear on the
        website.
      </p>
      <ol className="space-y-2">
        {ids.map((id, index) => {
          const member = members.find((entry) => entry.id === id);
          const name = member?.name || "Unavailable member";
          return (
            <li key={id} className="flex items-center gap-1 rounded border p-2">
              <span className="flex-1 text-sm">
                {name}
                {member?.status !== "published" && ` (${member?.status || "missing"})`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${name} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${name} down`}
                disabled={index === ids.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(ids.filter((item) => item !== id))}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ol>
      <Input
        aria-label="Find team members"
        placeholder="Find team members"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {members
          .filter(
            (member) =>
              !ids.includes(member.id) &&
              `${member.name} ${member.role}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((member) => (
            <Button
              key={member.id}
              type="button"
              variant="outline"
              className="w-full justify-start whitespace-normal text-left"
              onClick={() => onChange([...ids, member.id])}
            >
              Add {member.name} ({member.status})
            </Button>
          ))}
      </div>
      {!members.length && (
        <p className="text-xs text-muted-foreground">Create members in Content → Team first.</p>
      )}
    </div>
  );
}
