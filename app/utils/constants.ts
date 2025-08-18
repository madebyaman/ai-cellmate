export const ROUTES = {
  HOME: "/",
  APP: "/app", // This now redirects to first organization
  LOGIN: "/login",
  CREATE_ORGANIZATION: "/create-organization",
  BILLING: "/billing",
  LOGOUT: "/logout",
  DASHBOARD: (slug: string) => "/" + slug,
  SETTINGS: (slug: string) => `/${slug}/settings`,
  BILLING_SETTINGS: (slug: string) => `/${slug}/settings/billing`,
} as const;
