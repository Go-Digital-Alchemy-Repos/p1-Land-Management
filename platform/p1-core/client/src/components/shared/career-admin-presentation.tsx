import type { ComponentType, ReactNode } from "react";
export type CareerTableUI = {
  Table: ComponentType<any>;
  TableHeader: ComponentType<any>;
  TableBody: ComponentType<any>;
  TableRow: ComponentType<any>;
  TableHead: ComponentType<any>;
  TableCell: ComponentType<any>;
  Badge: ComponentType<any>;
};
export type CareerCardUI = {
  Card: ComponentType<any>;
  CardHeader: ComponentType<any>;
  CardContent: ComponentType<any>;
  CardTitle: ComponentType<any>;
  CardDescription: ComponentType<any>;
};
export function CareerJobsTable<
  T extends {
    id: string;
    title: string;
    slug: string;
    status: string;
    employmentType?: string;
    location?: string | null;
  },
>({
  ui,
  jobs,
  statusLabel,
  employmentLabel,
  actions,
}: {
  ui: CareerTableUI;
  jobs: T[];
  statusLabel: (value: string) => string;
  employmentLabel: (value: string) => string;
  actions: (job: T) => ReactNode;
}) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = ui;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <div className="font-medium">{job.title}</div>
              <div className="text-xs text-muted-foreground">/careers/{job.slug}</div>
            </TableCell>
            <TableCell>
              <Badge variant={job.status === "published" ? "default" : "outline"}>
                {statusLabel(job.status)}
              </Badge>
            </TableCell>
            <TableCell>{employmentLabel(job.employmentType || "")}</TableCell>
            <TableCell>{job.location || "Remote/unspecified"}</TableCell>
            <TableCell className="text-right">{actions(job)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function CareerApplicationsTable<
  T extends {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt?: string | Date | null;
  },
>({
  ui,
  applications,
  statusLabel,
  jobTitle,
  onSelect,
  disabled = false,
}: {
  ui: CareerTableUI;
  applications: T[];
  statusLabel: (value: string) => string;
  jobTitle: (row: T) => string;
  onSelect: (row: T) => void;
  disabled?: boolean;
}) {
  const { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } = ui;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Applicant</TableHead>
          <TableHead>Job</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.id} className="cursor-pointer">
            <TableCell>
              <div className="font-medium">
                <button type="button" disabled={disabled} onClick={() => onSelect(application)}>
                  {application.firstName} {application.lastName}
                </button>
              </div>
              <div className="text-xs text-muted-foreground">{application.email}</div>
            </TableCell>
            <TableCell>{jobTitle(application)}</TableCell>
            <TableCell>
              <Badge variant="outline">{statusLabel(application.status)}</Badge>
            </TableCell>
            <TableCell>
              {application.createdAt
                ? new Date(application.createdAt).toLocaleDateString()
                : "Date unavailable"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function CareerCard({
  ui,
  title,
  description,
  actions,
  children,
}: {
  ui: CareerCardUI;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { Card, CardHeader, CardTitle, CardDescription, CardContent } = ui;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
export function CareerApplicationWorkspace({
  ui,
  list,
  detail,
}: {
  ui: CareerCardUI;
  list: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <CareerCard
        ui={ui}
        title="Applications"
        description="Review applicants and update hiring status."
      >
        {list}
      </CareerCard>
      <CareerCard ui={ui} title="Application Detail">
        {detail || (
          <p className="text-sm text-muted-foreground">Select an application to review.</p>
        )}
      </CareerCard>
    </div>
  );
}
export function CareerJobFields({
  details,
  salaryVisible,
  summary,
  body,
  seo,
  noindex,
  extra,
  actions,
}: {
  details: ReactNode;
  salaryVisible: ReactNode;
  summary: ReactNode;
  body: ReactNode;
  seo: ReactNode;
  noindex: ReactNode;
  extra?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">{details}</div>
      {salaryVisible}
      {summary}
      {body}
      <div className="grid gap-4 md:grid-cols-2">{seo}</div>
      {noindex}
      {extra}
      <div className="flex justify-end gap-2 flex-wrap">{actions}</div>
    </div>
  );
}
export function CareerSettingsCards({
  ui,
  sharing,
  integrations,
}: {
  ui: CareerCardUI;
  sharing: ReactNode;
  integrations: ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CareerCard
        ui={ui}
        title="Share Options"
        description="Control share actions on public job pages."
      >
        {sharing}
      </CareerCard>
      <CareerCard
        ui={ui}
        title="Integrations"
        description="Enable job discovery and ATS bridge points when partner credentials are available."
      >
        {integrations}
      </CareerCard>
    </div>
  );
}
