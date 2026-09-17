export type NativeRoleHome = Readonly<{
  title: string;
  detail: string;
}>;

export function nativeRoleHome(role: string | null): NativeRoleHome {
  switch (role) {
    case "crew":
      return {
        title: "Assigned field work",
        detail:
          "Download only your assigned work before going offline. Saved entries remain pending until P1 accepts them.",
      };
    case "client":
      return {
        title: "Your property workspace",
        detail:
          "Review the properties and published updates that P1 has authorized for your account.",
      };
    case "owner":
    case "manager":
    case "dispatch":
      return {
        title: "Operations workspace",
        detail:
          "Review authorized work and property updates here; scheduling changes and approvals remain in the office dashboard.",
      };
    case "sales":
      return {
        title: "Sales workspace",
        detail:
          "Review authorized property context here; commercial pursuit and proposal changes remain in the office dashboard.",
      };
    case "finance":
      return {
        title: "Finance workspace",
        detail:
          "Review authorized property context here; agreements, billing and payments remain in the office dashboard.",
      };
    default:
      return {
        title: "P1 workspace",
        detail:
          "Your P1 permissions determine the work and property information available here.",
      };
  }
}
