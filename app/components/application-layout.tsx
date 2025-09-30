import type { ReactNode } from "react";
import { useState } from "react";
import { Form, Link } from "react-router";
import {
  Bell,
  Calendar,
  ChevronDown,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PieChart,
  Settings,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "~/utils/misc";
import WorkspaceDropdown from "~/components/workspace-dropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/dropdown-menu";
import { Dialog, DialogContent, DialogPortal } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import type { Organization } from "~/types/prisma";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current: boolean;
}

interface ApplicationLayoutProps {
  children: ReactNode;
  user?: User;
  orgs?: {
    id: Organization["id"];
    name: Organization["name"];
  }[];
  selectedOrgId?: Organization["id"] | null;
  title?: string;
  className?: string;
  outerContainerClass?: string;
  currentPath?: string;
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home, current: true },
  {
    name: "CSV Playground",
    href: "/csv-playground",
    icon: Upload,
    current: false,
  },
  { name: "Projects", href: "/projects", icon: FolderOpen, current: false },
  { name: "Calendar", href: "/calendar", icon: Calendar, current: false },
  { name: "Documents", href: "/documents", icon: FileText, current: false },
  { name: "Reports", href: "/reports", icon: PieChart, current: false },
];

const teams = [
  {
    id: 1,
    name: "Engineering",
    href: "/teams/engineering",
    initial: "E",
    current: false,
  },
  {
    id: 2,
    name: "Marketing",
    href: "/teams/marketing",
    initial: "M",
    current: false,
  },
  { id: 3, name: "Sales", href: "/teams/sales", initial: "S", current: false },
];

export default function ApplicationLayout({
  children,
  user,
  orgs = [],
  selectedOrgId,
  title,
  className,
  outerContainerClass,
  currentPath = "/",
}: ApplicationLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update current navigation item based on current path
  const updatedNavigation = navigation.map((item) => ({
    ...item,
    current: item.href === currentPath,
  }));

  const updatedTeams = teams.map((team) => ({
    ...team,
    current: team.href === currentPath,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Mobile sidebar dialog */}
      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogPortal>
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-gray-900/80" />
            <DialogContent className="fixed inset-y-0 left-0 z-50 w-full max-w-xs p-0 border-0 bg-transparent shadow-none">
              <div className="relative flex h-full w-full max-w-xs flex-1 transform bg-gray-50">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-600"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-gray-600" />
                  </button>
                </div>
                {/* Sidebar component for mobile */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto px-4 py-4">
                  {/* Workspace Dropdown at top */}
                  {orgs.length > 0 && (
                    <div className="mb-4">
                      <WorkspaceDropdown
                        orgs={orgs}
                        selectedOrgId={selectedOrgId}
                      />
                    </div>
                  )}

                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col space-y-1">
                      {/* Main navigation */}
                      {updatedNavigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={cn(
                              item.current
                                ? "bg-gray-200 text-gray-900"
                                : "text-gray-700 hover:bg-gray-200 hover:text-gray-900",
                              "group flex gap-x-3 rounded-md p-2 text-sm font-medium",
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {item.name}
                          </Link>
                        </li>
                      ))}

                      {/* Upcoming Events section */}
                      <li className="mt-6">
                        <div className="text-xs font-semibold text-gray-500 mb-2">
                          Upcoming Events
                        </div>
                        <ul role="list" className="space-y-1">
                          {updatedTeams.map((team) => (
                            <li key={team.name}>
                              <Link
                                to={team.href}
                                className={cn(
                                  team.current
                                    ? "bg-gray-200 text-gray-900"
                                    : "text-gray-700 hover:bg-gray-200 hover:text-gray-900",
                                  "group flex gap-x-3 rounded-md p-2 text-sm font-medium",
                                )}
                              >
                                <span className="truncate">{team.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>

                      {/* Support and Changelog */}
                      <li className="mt-6 space-y-1">
                        <Link
                          to="/support"
                          className="group flex gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                        >
                          <MessageCircle className="h-5 w-5 shrink-0" />
                          Support
                        </Link>
                        <Link
                          to="/changelog"
                          className="group flex gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                        >
                          <FileText className="h-5 w-5 shrink-0" />
                          Changelog
                        </Link>
                      </li>

                      {/* Profile section at bottom */}
                      {user && (
                        <li className="mt-auto pt-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
                                {user.image ? (
                                  <img
                                    className="h-6 w-6 rounded-full"
                                    src={user.image}
                                    alt={user.name}
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                                    <User className="h-4 w-4 text-gray-600" />
                                  </div>
                                )}
                                <span className="truncate">{user.name}</span>
                                <ChevronDown className="ml-auto h-4 w-4 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-medium leading-none">
                                    {user.name}
                                  </p>
                                  <p className="text-xs leading-none text-gray-500">
                                    {user.email}
                                  </p>
                                </div>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/profile-settings"
                                  className="flex items-center"
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  <span>Profile</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/settings"
                                  className="flex items-center"
                                >
                                  <Settings className="mr-2 h-4 w-4" />
                                  <span>Settings</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Form method="post" action="/auth/signout">
                                  <button className="flex w-full items-center">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign out</span>
                                  </button>
                                </Form>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      )}
                    </ul>
                  </nav>
                </div>
              </div>
            </DialogContent>
          </div>
        </DialogPortal>
      </Dialog>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-50 px-4 py-4">
          {/* Workspace Dropdown at top */}
          {orgs.length > 0 && (
            <div className="mb-4">
              <WorkspaceDropdown orgs={orgs} selectedOrgId={selectedOrgId} />
            </div>
          )}

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col space-y-1">
              {/* Main navigation */}
              {updatedNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      item.current
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-200 hover:text-gray-900",
                      "group flex gap-x-3 rounded-md p-2 text-sm font-medium",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}

              {/* Upcoming Events section */}
              <li className="mt-6">
                <div className="text-xs font-semibold text-gray-500 mb-2">
                  Latest Projects
                </div>
                <ul role="list" className="space-y-1">
                  {updatedTeams.map((team) => (
                    <li key={team.name}>
                      <Link
                        to={team.href}
                        className={cn(
                          team.current
                            ? "bg-gray-200 text-gray-900"
                            : "text-gray-700 hover:bg-gray-200 hover:text-gray-900",
                          "group flex gap-x-3 rounded-md p-2 text-sm font-medium",
                        )}
                      >
                        <span className="truncate">{team.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>

              {/* Support and Changelog */}
              <li className="mt-6 space-y-1">
                <Link
                  to="/support"
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  Support
                </Link>
                <Link
                  to="/changelog"
                  className="group flex gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  Changelog
                </Link>
              </li>

              {/* Profile section at bottom */}
              {user && (
                <li className="mt-auto pt-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
                        {user.image ? (
                          <img
                            className="h-6 w-6 rounded-full"
                            src={user.image}
                            alt={user.name}
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                        <span className="truncate">{user.name}</span>
                        <ChevronDown className="ml-auto h-4 w-4 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.name}
                          </p>
                          <p className="text-xs leading-none text-gray-500">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          to="/profile-settings"
                          className="flex items-center"
                        >
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Form method="post" action="/auth/signout">
                          <button className="flex w-full items-center">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign out</span>
                          </button>
                        </Form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>

      {/*{/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white border-b px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-600 lg:hidden"
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
          {title || "Dashboard"}
        </div>
        {/* Mobile notifications and profile */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4" />
            <span className="sr-only">Feedback</span>
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center">
                  <span className="sr-only">Your profile</span>
                  {user.image ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.image}
                      alt={user.name}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile-settings" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Form method="post" action="/auth/signout">
                    <button className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </Form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main content */}
      <main
        className={cn(
          "lg:pl-64 flex-1 flex flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2",
          outerContainerClass,
        )}
      >
        {/* Spacer to allow shadow/ring to be visible on the left */}
        <div className="hidden lg:block lg:w-2 lg:flex-shrink-0"></div>
        <div className="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-sm lg:ring-1 lg:ring-zinc-950/5 lg:ml-2">
          {children}
        </div>
      </main>
    </div>
  );
}
