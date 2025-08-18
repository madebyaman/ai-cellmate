import { Frown, HeartIcon, Menu, SmileIcon, ThumbsUp, X } from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useFetcher,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";
import { AuthenticityTokenInput } from "remix-utils/csrf/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/popover";
import { Button } from "~/components/ui/button";
import {
  requireUser,
  requireOrganization,
  requireSubscription,
  getActiveOrganizationId,
} from "~/utils/auth.server";
import { auth } from "~/lib/auth.server";
import { verifyUserAccessToOrganization } from "~/utils/organization.server";

const user = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};

const getNavigation = (slug: string) => [
  {
    name: "Dashboard",
    href: slug,
  },
  {
    name: "Settings",
    href: `${slug}/settings`,
  },
];

const userNavigation = [
  { name: "Your Profile", href: "#" },
  { name: "Settings", href: "#" },
  { name: "Sign out", href: "#" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const [user, organization, activeOrgId] = await Promise.all([
    requireUser(request),
    requireOrganization(request),
    getActiveOrganizationId(request),
  ]);
  const subscription = await requireSubscription(request, activeOrgId ?? "");

  const slug = params.slug as string;
  const verifiedOrg = await verifyUserAccessToOrganization({
    slug,
    userId: user.id,
  });

  // Set active organization if none exists
  if (!activeOrgId) {
    await auth.api.setActiveOrganization({
      body: {
        organizationId: verifiedOrg.id,
        organizationSlug: verifiedOrg.slug ?? "",
      },
      headers: request.headers,
    });
  }
  console.log("sub", subscription);

  return { organization: verifiedOrg, user, subscription };
}

export default function Example() {
  const params = useParams();
  const navigation = getNavigation(params.slug!);
  return (
    <div className="min-h-full flex flex-col">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex shrink-0 items-center">
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
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === "" ? true : false}
                    className={({ isActive, isPending }) =>
                      [
                        isPending || isActive
                          ? "border-indigo-500 text-gray-900"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                        "inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium",
                      ].join(" ")
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <FeedbackButton />

              {/* Profile dropdown */}
              <div className="relative ml-3">
                <DropdownMenu>
                  <DropdownMenuTrigger className="relative flex max-w-xs items-center rounded-full bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt=""
                      src={user.imageUrl}
                      className="size-8 rounded-full"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 ring-1 shadow-lg ring-black/5 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in">
                    {userNavigation.map((item) => (
                      <DropdownMenuItem key={item.name}>
                        <a
                          href={item.href}
                          className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                        >
                          {item.name}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              {/* Mobile menu button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group relative inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden">
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open main menu</span>
                    <Menu
                      aria-hidden="true"
                      className="block size-6 group-data-open:hidden"
                    />
                    <X
                      aria-hidden="true"
                      className="hidden size-6 group-data-open:block"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="sm:hidden border-0">
                  <div className="border-t border-gray-200 pt-4 pb-3">
                    <div className="space-y-1 pt-2 pb-3">
                      {navigation.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          className={({ isActive, isPending }) =>
                            [
                              isPending || isActive
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800",
                              "block border-l-4 py-2 pr-4 pl-3 text-base font-medium",
                            ].join(" ")
                          }
                        >
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 pt-4 pb-3">
                      <div className="flex items-center px-4">
                        <div className="shrink-0">
                          <img
                            alt=""
                            src={user.imageUrl}
                            className="size-10 rounded-full"
                          />
                        </div>
                        <div className="ml-3">
                          <div className="text-base font-medium text-gray-800">
                            {user.name}
                          </div>
                          <div className="text-sm font-medium text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {userNavigation.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10 bg-gray-50 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

const moods = [
  // { name: 'Excited', value: 'excited', icon: , iconColor: 'text-white', bgColor: 'bg-red-500' },
  {
    name: "Loved",
    value: "loved",
    icon: HeartIcon,
    iconColor: "text-white",
    bgColor: "bg-pink-400",
  },
  {
    name: "Happy",
    value: "happy",
    icon: SmileIcon,
    iconColor: "text-white",
    bgColor: "bg-green-400",
  },
  {
    name: "Sad",
    value: "sad",
    icon: Frown,
    iconColor: "text-white",
    bgColor: "bg-yellow-400",
  },
  {
    name: "Thumbsy",
    value: "thumbsy",
    icon: ThumbsUp,
    iconColor: "text-white",
    bgColor: "bg-blue-500",
  },
  {
    name: "I feel nothing",
    value: null,
    icon: X,
    iconColor: "text-gray-400",
    bgColor: "bg-transparent",
  },
];

function Feedback() {
  const fetcher = useFetcher();
  // const [selected, setSelected] = useState<string | null>(null);
  // const selectedMood = moods.find((m) => m.name === selected) ?? null;
  return (
    <fetcher.Form method="post">
      <AuthenticityTokenInput />
      <HoneypotInputs />
      <div className="p-2">
        <label htmlFor="feedback" className="sr-only">
          Feedback
        </label>
        <textarea
          id="feedback"
          name="feedback"
          rows={3}
          placeholder="Your feedback"
          className="rounded bg-white outline-1 -outline-offset-1 outline-gray-200 block w-full resize-none px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 sm:text-sm/6"
          defaultValue={""}
        />

        {/* Spacer element to match the height of the toolbar */}
      </div>

      <div className="bg-gray-50">
        <div className="flex items-center justify-between space-x-3 border-t border-gray-200 px-2 py-2 sm:px-3">
          {/*<div className="flex">
            <Select>
              <SelectTrigger className="border-0 shadow-none *:svg:hidden">
                <button
                  type="button"
                  className="group -my-2 -ml-2 inline-flex items-center rounded-full px-3 py-2 text-left text-gray-400"
                >
                  {selectedMood === null ? (
                    <>
                      <SmileIcon
                        aria-hidden="true"
                        className="mr-2 -ml-1 size-5 group-hover:text-gray-500"
                      />
                      <span className="text-sm text-gray-500 italic group-hover:text-gray-600">
                        How do you feel?
                      </span>
                    </>
                  ) : (
                    <span>
                      <span
                        className={cn(
                          selectedMood.bgColor,
                          "flex size-8 items-center justify-center rounded-full",
                        )}
                      >
                        <selectedMood.icon
                          aria-hidden="true"
                          className="size-5 shrink-0 text-white"
                        />
                      </span>
                      <span className="sr-only">{selectedMood.name}</span>
                    </span>
                  )}
                </button>
              </SelectTrigger>
              <SelectContent className="border-0">
                {moods.map((m) => (
                  <SelectItem value={m.name}>
                    <div className="flex items-center">
                      <div
                        className={cn(
                          m.bgColor,
                          "flex size-8 items-center justify-center rounded-full",
                        )}
                      >
                        <m.icon
                          aria-hidden="true"
                          className={cn(m.iconColor, "size-5 shrink-0")}
                        />
                      </div>
                      <span className="ml-3 block truncate font-medium">
                        {m.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>*/}
          <div className="shrink-0">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </fetcher.Form>
  );
}

function FeedbackButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="m-1 text-gray-500 border-transparent hover:border-gray-300 text-sm"
        >
          Leave Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-sm">
        <Feedback />
      </PopoverContent>
    </Popover>
  );
}
