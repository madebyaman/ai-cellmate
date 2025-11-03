import { AuthenticityTokenInput } from "remix-utils/csrf/react";
import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { Button } from "~/components/ui/button";
import { Form } from "react-router";
import Input from "~/components/ui/input";
import { ArrowRight } from "lucide-react";
import Heading from "~/components/ui/heading";
import type { ReactNode } from "react";
import Text from "~/components/ui/text";

export function Welcome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav
        ref={(item) => {
          if (!item) return;

          const handleScroll = () => {
            if (window.scrollY > 0) {
              item.setAttribute("data-scroll", "true");
            } else {
              item.removeAttribute("data-scroll");
            }
          };

          window.addEventListener("scroll", handleScroll);
          handleScroll();

          return () => {
            window.removeEventListener("scroll", handleScroll);
          };
        }}
        className="text-sm sticky -top-2 pt-5 pb-3 bg-white z-10 data-[scroll]:border-b-[1px] border-gray-100"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-xl font-bold text-gray-900">AICellmate</div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </a>
              <a href="/terms" className="text-gray-600 hover:text-gray-900">
                Terms
              </a>
              <a href="/login" className="text-gray-600 hover:text-gray-900">
                Sign in
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto space-y-12 pt-16 min-h-screen flex flex-col justify-between">
        <div className="flex-1">
          {/* Hero Section */}
          <section className="py-14 md:py-24">
            <div>
              <Heading className="mx-auto w-full text-center max-w-2xl">
                Upload a CSV,{" "}
                <HighlightedTextPart>get all the data</HighlightedTextPart> you
                need
              </Heading>
              <Text className="mx-auto mt-6 max-w-lg text-center sm:mt-8">
                AICellmate turns your partial CSVs into complete, accurate
                datasets—automatically. No more guessing—get clean, complete,
                and trustworthy data.
              </Text>
            </div>
            <div className="mt-10 justify-center items-center flex flex-col">
              <a href="/login">
                <Button variant="default" className="group">
                  Get started
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <p className="text-sm text-gray-500 mt-6">
                Over 2000 CSVs processed.
              </p>
            </div>
            <div className="mt-8 relative breakout max-w-5xl mx-auto">
              <div
                className="relative flex justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-500 bg-gradient-to-bl w-full from-[#ffe4e6]  to-[#ccfbf1]"
                style={{
                  aspectRatio: "2.08/1",
                  // background: 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(199, 210, 254, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(129, 140, 248, 0.2), transparent 60%), linear-gradient(135deg, #e0e7ff, #c7d2fe)'
                }}
              >
                <div className="absolute inset-x-0 -bottom-14 top-0 flex w-full justify-center p-6 sm:p-8 md:p-10">
                  <img
                    src="/hero.png"
                    alt="Hero"
                    className="h-auto w-full max-w-full rounded-lg shadow-sm ring-1 ring-gray-500/10 transition-opacity duration-300"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="py-14 md:py-24">
            <div className="flex flex-row gap-8">
              <div className="-rotate-2 border-4 border-white shadow-sm rounded">
                <img src="/testimonial.jpg" className="rounded" />
              </div>
              <div className="flex flex-col">
                <Text className="text-lg sm:text-xl font-medium">
                  "We were manually enriching our CRM data for 500+ leads each
                  month—it took forever and had gaps. Now AICellmate fills those
                  blanks in minutes with{" "}
                  <HighlightedTextPart>
                    verified data from real sources
                  </HighlightedTextPart>
                  . Game changer for our sales team."
                </Text>
                <Text className="mt-auto text-base sm:text-lg text-gray-800 font-bold">
                  Sarah Mitchell
                </Text>
                <Text className="text-sm sm:text-base">
                  Sales Operations Director
                </Text>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-14 md:py-24">
            <div>
              <Heading className="w-full mx-auto text-center max-w-2xl" as="h2">
                <HighlightedTextPart>Smarter spreadsheets</HighlightedTextPart>{" "}
                start here
              </Heading>
              <Text className="mx-auto mt-6 max-w-lg text-center sm:mt-8">
                AICellmate scans your CSV, detects what's missing, and fills it
                using AI, verified sources, and live search
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-8 sm:mt-12">
              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  01. Discover
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Spot Missing Data Instantly
                </Heading>
                <Text className="text-sm sm:text-base">
                  AICellmate scans your CSV and identifies gaps—emails, phone
                  numbers, company profiles, and more. Get a clear picture of
                  what needs to be filled before you start.
                </Text>
              </div>

              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  02. Enrich
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Add Verified Information
                </Heading>
                <Text className="text-sm sm:text-base">
                  Pull verified data from trusted sources in real time. Our AI
                  searches the web, verifies accuracy, and fills in the blanks
                  with confidence scores so you know what's reliable.
                </Text>
              </div>

              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  03. Validate
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Ensure Every Value Is Right
                </Heading>
                <Text className="text-sm sm:text-base">
                  Check every enriched value for accuracy before finalizing.
                  Review confidence scores, see the sources, and approve data
                  with full transparency.
                </Text>
              </div>

              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  04. Export
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Deliver Data Your Way
                </Heading>
                <Text className="text-sm sm:text-base">
                  Export your complete, enriched dataset as CSV, Excel, or JSON.
                  Send directly to Google Sheets, your CRM, or data warehouse.
                </Text>
              </div>
            </div>
          </section>

          {/*<section className="py-20 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <span className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
                Automated Enrichment
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-6">
                Your AI-powered data assistant.
              </h2>
              <p className="text-xl text-gray-600 mb-12">
                Upload your CSV, select your columns, and let AICellmate do the heavy lifting. Our AI agents search the web, verify data, and fill gaps intelligently—no manual work required.
              </p>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg mr-4 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Smart Matching
                    </h4>
                    <p className="text-gray-600">
                      AI automatically matches the right information to the right row, handling complex lookups and data relationships.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg mr-4 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Bulk Processing
                    </h4>
                    <p className="text-gray-600">
                      Process hundreds or thousands of rows simultaneously. What would take weeks of manual work takes minutes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg mr-4 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Live Data Sources
                    </h4>
                    <p className="text-gray-600">
                      Pull from real-time sources and databases. Your enriched data is always current and up-to-date.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>*/}

          {/*<section className="py-20">
            <div className="max-w-4xl mx-auto">
              <span className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
                Integrations
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mt-4 mb-6">
                Works where you work.
              </h2>
              <p className="text-xl text-gray-600 mb-12">
                AICellmate integrates seamlessly with your existing tools and workflows. Export enriched data anywhere or connect directly to your platforms.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="border border-gray-200 p-8 rounded-2xl hover:shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Export Anywhere</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500">✓</span>
                      <span>CSV, Excel, or JSON formats</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500">✓</span>
                      <span>Direct integration with Google Sheets</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500">✓</span>
                      <span>Download and store locally</span>
                    </li>
                  </ul>
                </div>

                <div className="border border-gray-200 p-8 rounded-2xl hover:shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">API & Automation</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500">✓</span>
                      <span>REST API for programmatic access</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500">✓</span>
                      <span>Webhooks for real-time updates</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-3 text-orange-500">✓</span>
                      <span>Connect to data warehouses and CRMs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Privacy & Accuracy First
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                AICellmate prioritizes both compliance and correctness. Your
                data stays secure, and every filled entry comes with a
                confidence score so you can trust your results.
              </p>
            </div>
          </section>

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
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    4.8 ★★★★★
                  </div>
                  <p className="text-gray-600">on G2</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    4.9 ★★★★★
                  </div>
                  <p className="text-gray-600">on Capterra</p>
                </div>
              </div>
            </div>
          </section>*/}

          {/* CTA Section */}
          <section className="py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Bring AICellmate to your workflow.
              </h2>
              <p className="text-xl text-gray-600 mb-6">
                Fill any CSV—fast, accurate, and automated.
              </p>

              <a href="/login">
                <Button variant="default" className="group">
                  Get started
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <p className="text-gray-500 text-sm">No credit card required.</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 AICellmate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HighlightedTextPart({ children }: { children: ReactNode }) {
  return (
    <span className="bg-linear-to-b from-60% from-transparent to-60% to-yellow-200">
      {children}
    </span>
  );
}
