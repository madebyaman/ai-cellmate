import { NavLink, Outlet } from "react-router";
import LayoutWrapper from "~/components/layout-wrapper";

const secondaryNavigation = [
  { name: "Profile & Preferences", href: "" },
  { name: "Billing & Plan", href: "billing" },
  { name: "Team members", href: "team" },
  { name: "Danger Zone", href: "danger" },
];

export default function Settings() {
  return (
    <LayoutWrapper>
      <div className="flex gap-4">
        <h1 className="sr-only">General Settings</h1>
        <aside className="flex overflow-x-auto border-b border-gray-900/5 lg:block lg:w-64 lg:flex-none lg:border-0">
          <nav className="flex-none px-4 sm:px-6 lg:px-0">
            <h2 className="text-sm font-semibold text-gray-500 mb-6 pl-2 mt-4">
              Settings
            </h2>
            <ul
              role="list"
              className="flex gap-x-3 gap-y-1 whitespace-nowrap lg:flex-col"
            >
              {secondaryNavigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    end
                    to={item.href}
                    className={({ isActive, isPending }) =>
                      [
                        isActive || isPending
                          ? "bg-gray-200 text-gray-800"
                          : "text-gray-700 hover:bg-gray-200",
                        "group flex gap-x-3 rounded-md py-2 pr-3 pl-2 text-sm/6 font-semibold",
                      ].join(" ")
                    }
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="flex-1 flex flex-col gap-8">
          <Outlet />
        </div>
      </div>
    </LayoutWrapper>
  );
}
