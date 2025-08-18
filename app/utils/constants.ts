export const ROUTES = {
  HOME: "/",
  APP: "/app", // This now redirects to first organization
  LOGIN: "/login",
  CREATE_ORGANIZATION: "/create-organization",
  BILLING: "/billing",
  LOGOUT: "/logout",
  DASHBOARD: "/app",
  SETTINGS: `/settings`,
  BILLING_SETTINGS: `/settings/billing`,
} as const;

export const INTENTS = {
  CHANGE_WORKSPACE: "change-workspace",
};
