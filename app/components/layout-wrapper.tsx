import type { ReactNode } from "react";

export default function LayoutWrapper({
  children,
  title,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <>
      {title ? (
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {title}
            </h1>
          </div>
        </header>
      ) : null}
      <main>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  );
}
