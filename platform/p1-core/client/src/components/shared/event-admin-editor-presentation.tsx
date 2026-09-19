import type { ComponentType, ReactNode } from "react";
import { CalendarDays, Users, Video, Repeat } from "lucide-react";
export type EventAdminPrimitives = Record<string, ComponentType<any>>;
export function EventAdminTabs({ ui }: { ui: EventAdminPrimitives }) {
  const { TabsList, TabsTrigger } = ui;
  return (
    <TabsList className="w-full grid grid-cols-4 mb-6" data-testid="tabs-event-editor">
      <TabsTrigger value="details" className="text-xs sm:text-sm" data-testid="tab-details">
        <CalendarDays className="h-3.5 w-3.5 mr-1.5 hidden text-purple-600 sm:inline-block" />
        Details
      </TabsTrigger>
      <TabsTrigger
        value="registrations"
        className="text-xs sm:text-sm"
        data-testid="tab-registrations"
      >
        <Users className="h-3.5 w-3.5 mr-1.5 hidden text-blue-600 sm:inline-block" />
        Registrants
      </TabsTrigger>
      <TabsTrigger
        value="video-archive"
        className="text-xs sm:text-sm"
        data-testid="tab-video-archive"
      >
        <Video className="h-3.5 w-3.5 mr-1.5 hidden text-rose-600 sm:inline-block" />
        Video Archive
      </TabsTrigger>
      <TabsTrigger value="recurring" className="text-xs sm:text-sm" data-testid="tab-recurring">
        <Repeat className="h-3.5 w-3.5 mr-1.5 hidden text-emerald-600 sm:inline-block" />
        Recurring
      </TabsTrigger>
    </TabsList>
  );
}
export function EventAdminDetails({
  ui,
  basic,
  schedule,
  structured,
  location,
  speaker,
}: {
  ui: EventAdminPrimitives;
  basic: ReactNode;
  schedule: ReactNode;
  structured: ReactNode;
  location: ReactNode;
  speaker: ReactNode;
}) {
  const { Card, CardHeader, CardTitle, CardContent } = ui;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{basic}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{schedule}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Structured Data (JSON-LD)</CardTitle>
          </CardHeader>
          <CardContent>{structured}</CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location &amp; Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{location}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Speaker / Host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{speaker}</CardContent>
        </Card>
      </div>
    </div>
  );
}
