import { type ReactNode } from "react";
import { cn } from "~/utils/misc";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto flex flex-col py-4 sm:px-6 lg:px-8">
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
        "sm:mx-auto sm:w-full sm:max-w-md flex-1 flex flex-col justify-center gap-4 items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
AuthShell.MainContainer = MainContainer;

function Navigation({ children }: { children: ReactNode }) {
  return (
    <div className="sm:items-center flex gap-4 justify-between mb-4">
      {children}
    </div>
  );
}
AuthShell.Navigation = Navigation;

function Header({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center">{children}</div>
  );
}
AuthShell.Header = Header;

function BorderedContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="bg-white ring-1 shadow-xs ring-gray-900/5 sm:rounded-xl py-8 px-4 sm:px-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
AuthShell.BorderedContainer = BorderedContainer;

function CTA({ children }: { children: ReactNode }) {
  return <div className="flex flex-col justify-end">{children}</div>;
}
AuthShell.CTA = CTA;

function AuthLogo() {
  return (
    <div className="flex shrink-0 items-center justify-center">
      <img
        alt="Your Company"
        src="https://tailwindui.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
        className="block h-8 w-auto lg:hidden"
      />
      <img
        alt="Your Company"
        src="https://tailwindui.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
        className="hidden h-8 w-auto lg:block"
      />
    </div>
  );
}
AuthShell.Logo = AuthLogo;

function Social({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6">
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
