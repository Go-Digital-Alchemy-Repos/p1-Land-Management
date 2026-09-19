import React from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicTeamMember } from "@shared/team";
import { TeamPresentation } from "@/features/admin/cms/builder/team-presentation";
import { TeamDialogHost } from "@/features/admin/cms/builder/team-dialog-host";
export function TeamSection({ props }: { props: Record<string, unknown> }) {
  const query = useQuery<PublicTeamMember[]>({ queryKey: ["/api/cms/team"] });
  return (
    <TeamDialogHost>
      <TeamPresentation
        props={props}
        members={query.data ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
      />
    </TeamDialogHost>
  );
}
