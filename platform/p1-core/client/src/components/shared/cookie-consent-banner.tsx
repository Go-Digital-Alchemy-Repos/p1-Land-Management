import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Settings2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_COOKIE_CONSENT_PREFERENCES,
  buildCookieConsentRecord,
  isCookieConsentRecordActive,
  readCookieConsentRecord,
  writeCookieConsentRecord,
  type CookieConsentPreferences,
} from "@/lib/cookie-consent";

function CookiePreferenceRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}

export function CookieConsentBanner() {
  const [location] = useLocation();
  const pathname = useMemo(() => location.split(/[?#]/)[0] || "/", [location]);
  const isHomepage = pathname === "/";
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsentPreferences>(
    DEFAULT_COOKIE_CONSENT_PREFERENCES,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = readCookieConsentRecord();
    const active = isCookieConsentRecordActive(stored);

    setPreferences(stored?.preferences ?? DEFAULT_COOKIE_CONSENT_PREFERENCES);
    setVisible(isHomepage && !active);
    setReady(true);
  }, [isHomepage]);

  const persistConsent = (nextPreferences: Partial<CookieConsentPreferences>) => {
    const record = buildCookieConsentRecord(nextPreferences);
    writeCookieConsentRecord(record);
    setPreferences(record.preferences);
    setVisible(false);
    setSettingsOpen(false);
  };

  const handleAcceptAll = () => {
    persistConsent({
      preferences: true,
      analytics: true,
      marketing: true,
    });
  };

  const handleEssentialOnly = () => {
    persistConsent(DEFAULT_COOKIE_CONSENT_PREFERENCES);
  };

  const handleSavePreferences = () => {
    persistConsent(preferences);
  };

  if (!ready || !isHomepage || !visible) {
    return (
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cookie Settings</DialogTitle>
            <DialogDescription>
              Essential cookies keep the site secure and functional. You can choose whether to allow
              non-essential cookies below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <CookiePreferenceRow
              title="Essential Cookies"
              description="Required for security, navigation, and core site functionality. These always stay on."
              checked
              disabled
            />
            <CookiePreferenceRow
              title="Preferences Cookies"
              description="Remember choices such as display preferences to improve your experience on return visits."
              checked={preferences.preferences}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, preferences: checked }))
              }
            />
            <CookiePreferenceRow
              title="Analytics Cookies"
              description="Help us understand how visitors use the site so we can improve performance and usability."
              checked={preferences.analytics}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, analytics: checked }))
              }
            />
            <CookiePreferenceRow
              title="Marketing Cookies"
              description="Support campaign tracking and embedded third-party tools that help us reach the right audience."
              checked={preferences.marketing}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, marketing: checked }))
              }
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleEssentialOnly}>
              Essential Only
            </Button>
            <Button type="button" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[1200] px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/90 animate-in slide-in-from-bottom-full duration-500">
          <div className="flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="mt-0.5 hidden rounded-full bg-primary/10 p-2 text-primary sm:block">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    We use cookies to improve your experience.
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Essential cookies keep the site working. You can accept all cookies or review
                    cookie settings to turn off non-essential cookies at any time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEssentialOnly}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Dismiss cookie notice"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Button type="button" onClick={handleAcceptAll}>
                  Accept All
                </Button>
                <Button type="button" variant="outline" onClick={handleEssentialOnly}>
                  Essential Only
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Cookie Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cookie Settings</DialogTitle>
            <DialogDescription>
              Essential cookies keep the site secure and functional. You can choose whether to allow
              non-essential cookies below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <CookiePreferenceRow
              title="Essential Cookies"
              description="Required for security, navigation, and core site functionality. These always stay on."
              checked
              disabled
            />
            <CookiePreferenceRow
              title="Preferences Cookies"
              description="Remember choices such as display preferences to improve your experience on return visits."
              checked={preferences.preferences}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, preferences: checked }))
              }
            />
            <CookiePreferenceRow
              title="Analytics Cookies"
              description="Help us understand how visitors use the site so we can improve performance and usability."
              checked={preferences.analytics}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, analytics: checked }))
              }
            />
            <CookiePreferenceRow
              title="Marketing Cookies"
              description="Support campaign tracking and embedded third-party tools that help us reach the right audience."
              checked={preferences.marketing}
              onCheckedChange={(checked) =>
                setPreferences((current) => ({ ...current, marketing: checked }))
              }
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleEssentialOnly}>
              Essential Only
            </Button>
            <Button type="button" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
