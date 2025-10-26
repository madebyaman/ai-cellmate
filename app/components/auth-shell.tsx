import { type ReactNode } from "react";
import { cn } from "~/utils/misc";
import { Logo } from "~/components/ui/logo";

export function AuthShell({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("min-h-full bg-gray-50", className)}>
      <div
        className={cn(
          "max-w-7xl mx-auto flex flex-col py-3 sm:px-6 lg:px-8",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function MainContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sm:mx-auto sm:w-full flex-1 flex flex-col justify-center gap-4 items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
AuthShell.MainContainer = MainContainer;

function Navigation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sm:items-center flex gap-4 justify-between mb-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
AuthShell.Navigation = Navigation;

function Header({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      {children}
    </div>
  );
}
AuthShell.Header = Header;

function BorderedContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col w-full">
      <div
        className={cn(
          "bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl py-8 px-4 sm:px-10 flex-1 flex flex-col",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
AuthShell.BorderedContainer = BorderedContainer;

function CTA({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-end", className)}>{children}</div>
  );
}
AuthShell.CTA = CTA;

function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center", className)}>
      <Logo size={32} />
    </div>
  );
}
AuthShell.Logo = AuthLogo;

function Social({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-6", className)}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-slate-500">Or continue with</span>
        </div>
      </div>
      {children}
    </div>
  );
}
AuthShell.Social = Social;
