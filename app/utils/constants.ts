export const ROUTES = {
  HOME: "/",
  APP: "/app", // This now redirects to first organization
  LOGIN: "/login",
  CREATE_ORGANIZATION: "/create-organization",
  BILLING: "/billing",
  LOGOUT: "/logout",
  DASHBOARD: "/app",
  SETTINGS: `/app/settings`,
  BILLING_SETTINGS: `/app/settings/billing`,
} as const;

export const INTENTS = {
  CHANGE_WORKSPACE: "change-workspace",
  CREATE_WORKSPACE: "create-workspace",
  INTENT: "intent",
};

export const CHANGE_WORKSPACE_FORM = {
  WORKSPACE_ID: "workspace-id",
  NEW_VALUE: "new",
};

export const CREATE_WORKSPACE_FORM = {
  NAME: "name",
  SLUG: "slug",
};
