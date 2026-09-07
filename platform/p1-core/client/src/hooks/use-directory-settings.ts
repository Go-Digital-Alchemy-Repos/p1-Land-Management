import { STALE_TIMES } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  DIRECTORY_LABEL_PRESETS,
  type PublicDirectorySettings,
} from "@shared/types/directory-settings";

export const DEFAULT_PUBLIC_DIRECTORY_SETTINGS: PublicDirectorySettings = {
  directoryMode: "service_provider",
  ...DIRECTORY_LABEL_PRESETS.service_provider,
  applicationFeeAmountCents: 15000,
  applicationFeeNoticeTitle: "Application Fee",
  applicationFeeNoticeBody:
    "Before your directory listing can be reviewed, an application fee is required. If you are approved, that amount can be credited toward your first membership invoice. If your application is denied, the fee is non-refundable.",
  applicationFeePolicySummary:
    "The application fee is collected before your application enters review. Approved applicants can have that amount credited toward their first membership invoice. Denied applications do not receive a refund.",
  applicationFeeCreditOnApproval: true,
  applicationFeeCreditAmountCents: 15000,
  renewalReminderDays: 30,
  paymentFailureGraceHours: 48,
  suspendListingOnPastDue: true,
  directoryRequiresApplicationProcess: true,
  directoryRequiresApprovedApplication: true,
  directoryRequiresActiveSubscription: true,
  directoryShowLocationJobs: false,
};

export function useDirectorySettings() {
  const query = useQuery<PublicDirectorySettings>({
    queryKey: ["/api/directory-settings"],
    staleTime: STALE_TIMES.LIVE,
  });

  return {
    ...query,
    settings: query.data ?? DEFAULT_PUBLIC_DIRECTORY_SETTINGS,
  };
}
