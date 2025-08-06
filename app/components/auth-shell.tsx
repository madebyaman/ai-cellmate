import { type ReactNode } from 'react';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

function Header({ children }: { children: ReactNode }) {
  return <div className="sm:mx-auto sm:w-full sm:max-w-md">{children}</div>;
}
AuthShell.Header = Header;

function AuthLogo() {
  return <div className="mx-auto h-12 w-12">AT</div>;
}
AuthShell.Logo = AuthLogo;

function AuthBody({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        {children}
      </div>
    </div>
  );
}
AuthShell.Body = AuthBody;

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
