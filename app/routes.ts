import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/marketing/coming-soon.tsx"),
  route("terms", "routes/marketing/terms.tsx"),
  route("home", "routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("create-organization", "routes/create-organization.tsx"),
  route("api/auth/:path/*", "routes/api-auth.ts"),
  route("logout", "routes/logout.ts"),
  route("billing", "./routes/billing.tsx"),
  layout("./routes/layout.tsx", [
    route("app", "./routes/dashboard.tsx"),
    route("settings", "./routes/settings.tsx", [
      index("./routes/profile-settings.tsx"),
      route("billing", "./routes/billing-settings.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
