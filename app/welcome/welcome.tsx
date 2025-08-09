import { AuthenticityTokenInput } from "remix-utils/csrf/react";
import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { Button } from "~/components/ui/button";
import { Form } from "react-router";

export function Welcome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-xl font-bold text-gray-900">AICellmate</div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-600 hover:text-gray-900">Product</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Resources</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Company</a>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">Sign in</button>
              <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                Start for free
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Upload a CSV, get all the data you need
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              AICellmate turns your partial CSVs into complete, accurate
              datasets—automatically.
            </p>
            <button className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 mb-4">
              Start for free
            </button>
            <p className="text-gray-500 text-sm">No credit card required.</p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Smarter spreadsheets start here
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              AICellmate scans your CSV, detects what's missing, and fills it using
              AI, verified sources, and live search
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="bg-blue-50 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mb-6"></div>
              <h3 className="text-xl font-semibold mb-4">Discover</h3>
              <p className="text-gray-600">
                Identify missing pieces of data like company info, emails,
                phone numbers, LinkedIn profiles, or product details
              </p>
            </div>

            <div className="bg-green-50 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-green-500 rounded-lg mb-6"></div>
              <h3 className="text-xl font-semibold mb-4">Enrich</h3>
              <p className="text-gray-600">
                Pull fresh, verified data from trusted sources.
              </p>
            </div>

            <div className="bg-purple-50 p-8 rounded-2xl">
              <div className="w-12 h-12 bg-purple-500 rounded-lg mb-6"></div>
              <h3 className="text-xl font-semibold mb-4">Validate</h3>
              <p className="text-gray-600">
                Ensure all filled values are correct before you use them.
              </p>
            </div>
          </div>
        </section>

        {/* Automation Section */}
        <section className="py-20 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
                  02. Automation
                </span>
                <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-6">
                  Data enrichment that just works.
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  With AICellmate, you can upload your file, select what data you want,
                  and let AI handle the rest.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-orange-500 rounded-full mt-1 mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Smart filling</h4>
                      <p className="text-gray-600">
                        Automatically match the right info to the right row.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-orange-500 rounded-full mt-1 mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Bulk processing</h4>
                      <p className="text-gray-600">
                        Handle hundreds or thousands of rows at once
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-orange-500 rounded-full mt-1 mr-4 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Real-time sources</h4>
                      <p className="text-gray-600">
                        Always pull the freshest available data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="h-64 bg-gradient-to-br from-orange-400 to-pink-400 rounded-lg"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="h-64 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg"></div>
            </div>

            <div>
              <span className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
                03. Integrations
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-6">
                Works where you do.
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                AICellmate integrates with Google Sheets, CRMs, data warehouses, and APIs.
              </p>

              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                  <p className="text-gray-700">Export to Excel, Sheets, or JSON.</p>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                  <p className="text-gray-700">Connect with Zapier or direct APIs.</p>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                  <p className="text-gray-700">Keep your data always synced.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Privacy & Accuracy First
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              AICellmate prioritizes both compliance and correctness. Your data stays secure, 
              and every filled entry comes with a confidence score so you can trust your results.
            </p>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Market-leading AI data filler
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Join the teams saving hours of work every week.
            </p>
            
            <div className="flex justify-center space-x-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">4.8 ★★★★★</div>
                <p className="text-gray-600">on G2</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">4.9 ★★★★★</div>
                <p className="text-gray-600">on Capterra</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Bring AICellmate to your workflow.
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Fill any CSV—fast, accurate, and automated.
            </p>
            
            <button className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 mb-4">
              Start for free
            </button>
            <p className="text-gray-500 text-sm">No credit card required.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-xl font-bold mb-4">AICellmate</div>
              <p className="text-gray-400">
                The fastest way to enrich your CSV data with AI.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const resources = [
  {
    href: "https://reactrouter.com/docs",
    text: "React Router Docs",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="stroke-slate-600 group-hover:stroke-current dark:stroke-slate-300"
      >
        <path
          d="M9.99981 10.0751V9.99992M17.4688 17.4688C15.889 19.0485 11.2645 16.9853 7.13958 12.8604C3.01467 8.73546 0.951405 4.11091 2.53116 2.53116C4.11091 0.951405 8.73546 3.01467 12.8604 7.13958C16.9853 11.2645 19.0485 15.889 17.4688 17.4688ZM2.53132 17.4688C0.951566 15.8891 3.01483 11.2645 7.13974 7.13963C11.2647 3.01471 15.8892 0.951453 17.469 2.53121C19.0487 4.11096 16.9854 8.73551 12.8605 12.8604C8.73562 16.9853 4.11107 19.0486 2.53132 17.4688Z"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "https://rmx.as/discord",
    text: "Join Discord",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="20"
        viewBox="0 0 24 20"
        fill="none"
        className="stroke-slate-600 group-hover:stroke-current dark:stroke-slate-300"
      >
        <path
          d="M15.0686 1.25995L14.5477 1.17423L14.2913 1.63578C14.1754 1.84439 14.0545 2.08275 13.9422 2.31963C12.6461 2.16488 11.3406 2.16505 10.0445 2.32014C9.92822 2.08178 9.80478 1.84975 9.67412 1.62413L9.41449 1.17584L8.90333 1.25995C7.33547 1.51794 5.80717 1.99419 4.37748 2.66939L4.19 2.75793L4.07461 2.93019C1.23864 7.16437 0.46302 11.3053 0.838165 15.3924L0.868838 15.7266L1.13844 15.9264C2.81818 17.1714 4.68053 18.1233 6.68582 18.719L7.18892 18.8684L7.50166 18.4469C7.96179 17.8268 8.36504 17.1824 8.709 16.4944L8.71099 16.4904C10.8645 17.0471 13.128 17.0485 15.2821 16.4947C15.6261 17.1826 16.0293 17.8269 16.4892 18.4469L16.805 18.8725L17.3116 18.717C19.3056 18.105 21.1876 17.1751 22.8559 15.9238L23.1224 15.724L23.1528 15.3923C23.5873 10.6524 22.3579 6.53306 19.8947 2.90714L19.7759 2.73227L19.5833 2.64518C18.1437 1.99439 16.6386 1.51826 15.0686 1.25995ZM16.6074 10.7755L16.6074 10.7756C16.5934 11.6409 16.0212 12.1444 15.4783 12.1444C14.9297 12.1444 14.3493 11.6173 14.3493 10.7877C14.3493 9.94885 14.9378 9.41192 15.4783 9.41192C16.0471 9.41192 16.6209 9.93851 16.6074 10.7755ZM8.49373 12.1444C7.94513 12.1444 7.36471 11.6173 7.36471 10.7877C7.36471 9.94885 7.95323 9.41192 8.49373 9.41192C9.06038 9.41192 9.63892 9.93712 9.6417 10.7815C9.62517 11.6239 9.05462 12.1444 8.49373 12.1444Z"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
];
