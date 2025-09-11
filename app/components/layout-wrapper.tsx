import type { ReactNode } from "react";
import { cn } from "~/utils/misc";

export default function LayoutWrapper({
  children,
  title,
  className,
  outerContainerClass,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  outerContainerClass?: string;
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
      <div className={cn("flex-1 flex bg-gray-50", outerContainerClass)}>
        <main
          className={cn(
            "py-10 mx-auto max-w-7xl flex-1 px-4 sm:px-6 lg:px-8",
            className,
          )}
        >
          {children}
        </main>
      </div>
    </>
  );
}
