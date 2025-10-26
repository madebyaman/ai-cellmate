export const ROUTES = {
  HOME: "/",
  APP: "/app", // This now redirects to first organization
  LOGIN: "/login",
  CREATE_ORGANIZATION: "/create-workspace",
  BILLING: "/billing",
  LOGOUT: "/logout",
  DASHBOARD: "/app",
  CSV_VIEW: "/csv-view",
  SETTINGS: `/app/settings`,
  BILLING_SETTINGS: `/app/settings/billing`,
  ACCEPT_INVITATION: "/accept-invitation",
} as const;

export const INTENTS = {
  CHANGE_WORKSPACE: "change-workspace",
  CREATE_WORKSPACE: "create-workspace",
  BILLING_PORTAL: "billing-portal",
  UPGRADE_TO_PRO: "upgrade-to-pro",
  BUY_CREDITS: "buy-credits",
  INVITE_MEMBER: "invite-member",
  INTENT: "intent",
  CANCEL_ENRICHMENT: "cancel-enrichment",
  EXPORT_CSV: "export-csv",
  DELETE_PROFILE: "delete-profile",
  DELETE_ORGANIZATION: "delete-organization",
};

export const CHANGE_WORKSPACE_FORM = {
  WORKSPACE_ID: "workspace-id",
  NEW_VALUE: "new",
};

export const CREATE_WORKSPACE_FORM = {
  NAME: "name",
  SLUG: "slug",
};

export const INVITE_MEMBER_FORM = {
  EMAIL: "email",
};

export const DELETE_ORGANIZATION_FORM = {
  ORGANIZATION_ID: "organization-id",
  CONFIRMATION: "confirmation",
};

export const DELETE_PROFILE_FORM = {
  CONFIRMATION: "confirmation",
};

export const BOOSTER_PLAN_NAME = "booster";

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceId: "price_1Rx3glSE1YMlG7zxDfVd4c0L",
    credits: 200,
    teamMembers: 1,
  },
  {
    id: "pro",
    name: "Pro",
    priceId: "price_1Rx3hxSE1YMlG7zxROgqgr32",
    credits: 500,
    teamMembers: 5,
  },
  {
    id: BOOSTER_PLAN_NAME,
    name: "Booster",
    priceId: "price_1Rx3iLSE1YMlG7zxAqGgw0dM",
    credits: 200,
  },
];
