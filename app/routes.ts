import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Public routes (no auth required)
  index("routes/marketing/coming-soon.tsx"),
  route("terms", "routes/marketing/terms.tsx"),
  route("home", "routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("accept-invitation", "routes/accept-invitation.tsx"),
  route("api/auth/:path/*", "routes/api-auth.ts"),
  route("api/stripe/webhook", "routes/api-stripe-webhook.ts"),
  route("sample", "routes/sample.tsx"),

  // Auth required but no organization/billing checks
  route("create-workspace", "routes/create-organization.tsx"),
  route("billing", "./routes/billing.tsx"),
  route("logout", "routes/logout.ts"),

  // Redirect route for /app
  // route("app", "routes/middleware.tsx"),

  // Protected routes with middleware checks
  route("app", "./routes/layout.tsx", [
    index("./routes/dashboard.tsx"),
    route("/app/:tableId", "routes/csv-view.tsx"),
    route("/app/:tableId/stream", "routes/csv-view.$tableId.stream.tsx"),
    route("settings", "./routes/settings.tsx", [
      index("./routes/profile-settings.tsx"),
      route("billing", "./routes/billing-settings.tsx"),
      route("team", "./routes/team-settings.tsx"),
      route("danger", "./routes/danger-settings.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
