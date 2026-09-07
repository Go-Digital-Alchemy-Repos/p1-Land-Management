import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Settings, Check, CheckCheck } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
};

type NotificationPrefs = {
  emailNewMessage: boolean;
  inAppNewMessage: boolean;
};

export function NotificationBell({
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const qc = useQueryClient();

  const unreadCount = useUnreadNotificationCount();

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: open,
  });

  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["/api/notifications/preferences"],
    enabled: settingsOpen,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const updatePrefs = useMutation({
    mutationFn: (data: Partial<NotificationPrefs>) =>
      apiRequest("PUT", "/api/notifications/preferences", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications/preferences"] }),
  });

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const clickedInPanel = panelRef.current && panelRef.current.contains(e.target as Node);
      const clickedInButton = buttonRef.current && buttonRef.current.contains(e.target as Node);
      if (!clickedInPanel && !clickedInButton) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setOpen]);

  function handleBellClick() {
    setOpen(!open);
  }

  function handleNotifClick(notif: Notification) {
    if (!notif.isRead) markOneRead.mutate(notif.id);
    setOpen(false);
  }

  const unreadNotifs = notifications?.filter((n) => !n.isRead) ?? [];
  const hasUnread = unreadNotifs.length > 0;

  return (
    <div className="relative">
      {showTrigger && (
        <button
          ref={buttonRef}
          onClick={handleBellClick}
          className="relative p-2 rounded-full hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="button-notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1 leading-none"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className={`${showTrigger ? "absolute right-0 top-full mt-2" : "fixed right-4 top-16"} w-80 sm:w-96 bg-background border rounded-xl shadow-xl z-[1200] overflow-hidden`}
          data-testid="panel-notifications"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                  data-testid="button-mark-all-read"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  setSettingsOpen(true);
                }}
                className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                data-testid="button-notification-settings"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!notifications ? (
              <div className="flex justify-center py-10">
                <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Bell className="h-8 w-8 opacity-20" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotifItem key={notif.id} notif={notif} onClick={handleNotifClick} />
              ))
            )}
          </div>
        </div>
      )}

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md z-[1300] px-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Settings
            </SheetTitle>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Notifications
              </h3>
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="pref-inapp" className="text-sm font-medium">
                      In-app notifications
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show a bell badge for new notifications
                    </p>
                  </div>
                  <Switch
                    id="pref-inapp"
                    checked={prefs?.inAppNewMessage ?? true}
                    onCheckedChange={(v) => updatePrefs.mutate({ inAppNewMessage: v })}
                    data-testid="toggle-inapp-notifications"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="pref-email" className="text-sm font-medium">
                      Email notifications
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receive email alerts for important updates
                    </p>
                  </div>
                  <Switch
                    id="pref-email"
                    checked={prefs?.emailNewMessage ?? true}
                    onCheckedChange={(v) => updatePrefs.mutate({ emailNewMessage: v })}
                    data-testid="toggle-email-notifications"
                  />
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NotifItem({
  notif,
  onClick,
}: {
  notif: Notification;
  onClick: (n: Notification) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true });

  const inner = (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${
        !notif.isRead ? "bg-accent/5" : ""
      }`}
      onClick={() => onClick(notif)}
      data-testid={`notification-item-${notif.id}`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <div className={`h-2 w-2 rounded-full ${notif.isRead ? "bg-transparent" : "bg-accent"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${notif.isRead ? "text-foreground/70" : "text-foreground font-medium"}`}
        >
          {notif.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>
      {notif.isRead && (
        <Check className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
      )}
    </div>
  );

  if (notif.linkUrl) {
    return <Link href={notif.linkUrl}>{inner}</Link>;
  }
  return inner;
}
