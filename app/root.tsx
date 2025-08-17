import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { csrf } from "./utils/csrf.server";

import type { Route } from "./+types/root";
import "./app.css";
import { honeypot } from "./utils/honeypot.server";
import { getToast } from "./utils/toast.server";
import { combineHeaders } from "./utils/misc";
import { HoneypotProvider } from "remix-utils/honeypot/react";
import { AuthenticityTokenProvider } from "remix-utils/csrf/react";
import { Toaster } from "sonner";
import { useToast } from "./components/use-toast";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request);
  const honeyProps = await honeypot.getInputProps();
  const { toast, headers: toastHeaders } = await getToast(request);
  return data(
    {
      ENV: process.env.NODE_ENV,
      csrfToken,
      honeyProps,
      toast,
    },
    {
      headers: combineHeaders(
        csrfCookieHeader ? { "set-cookie": csrfCookieHeader } : null,
        toastHeaders,
      ),
    },
  );
}

function Layout({
  children,
  env,
}: {
  children: React.ReactNode;
  env: string | undefined;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        {children}
        <Toaster richColors closeButton position="top-center" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)}`,
          }}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  useToast(data.toast);

  return (
    <HoneypotProvider {...data.honeyProps}>
      <AuthenticityTokenProvider token={data.csrfToken}>
        <Layout env={data.ENV}>
          <Outlet />
        </Layout>
      </AuthenticityTokenProvider>
    </HoneypotProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }
  if (
    message.trim() ===
    `TypeError: Cannot read properties of null (reading 'useContext')`
  ) {
    console.error("useContext error, full reload");
    window.location.reload();
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
