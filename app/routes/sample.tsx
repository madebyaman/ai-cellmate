import ApplicationLayout from "~/components/application-layout";
import Heading from "~/components/ui/heading";
import Select from "~/components/ui/select";

export default function SamplePage() {
  // Sample user data
  const user = {
    id: "user-1",
    name: "Erica Johnson",
    email: "erica@example.com",
  };

  // Sample organizations/workspaces
  const orgs = [
    { id: "org-1", name: "Acme Corp" },
    { id: "org-2", name: "Tech Startup" },
    { id: "org-3", name: "Consulting LLC" },
  ];

  const selectedOrgId = "org-1";

  return (
    <ApplicationLayout
      user={user}
      orgs={orgs}
      selectedOrgId={selectedOrgId}
      title="Dashboard"
    >
      <div className="space-y-8">
        <Heading>Good afternoon, {user.name.split(" ")[0]}</Heading>
        <div className="mt-8 flex items-end justify-between">
          <Heading as="h2">Overview</Heading>
          <div>
            <Select name="period">
              <option value="last_week">Last week</option>
              <option value="last_two">Last two weeks</option>
              <option value="last_month">Last month</option>
              <option value="last_quarter">Last quarter</option>
            </Select>
          </div>
        </div>

        {/* Sample content sections */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Projects
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">24</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">✅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed Tasks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">128</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⏳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Reviews
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">7</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  CSV enrichment completed for customer-data.csv
                </span>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  New workspace "Marketing Analytics" created
                </span>
                <span className="text-xs text-gray-500">1 day ago</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  Data enrichment started for leads.csv
                </span>
                <span className="text-xs text-gray-500">2 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
      <p>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Cum nostrum,
        nemo optio eveniet inventore fugit tempore vitae expedita architecto
        qui, quidem saepe error nisi. Animi earum facere perferendis nam
        voluptatem.
      </p>
    </ApplicationLayout>
  );
}
