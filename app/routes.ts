import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("api/auth/:path/*", "routes/api-auth.ts"),
  route("logout", "routes/logout.ts"),
  layout("./routes/layout.tsx", [
    route("app", "./routes/dashboard.tsx"),
    route("settings", "./routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
