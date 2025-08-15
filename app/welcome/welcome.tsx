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
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Product
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Pricing
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Resources
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                Company
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                Sign in
              </button>
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
              <Button variant="default" className="group">
                Get started
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-sm text-gray-500 mt-6">
                Over 2000 CSVs processed.
              </p>
            </div>
            <div className="mt-8 relative breakout max-w-5xl mx-auto">
              <div
                className="relative flex justify-center overflow-hidden rounded-xl shadow-sm transition-all duration-500 bg-gradient-to-bl from-[#ffe4e6]  to-[#ccfbf1]"
                style={{
                  aspectRatio: "5/3",
                  // background: 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(199, 210, 254, 0.3), transparent 50%), radial-gradient(circle at 40% 40%, rgba(129, 140, 248, 0.2), transparent 60%), linear-gradient(135deg, #e0e7ff, #c7d2fe)'
                }}
              >
                <div className="absolute inset-x-0 -bottom-20 top-0 z-20 flex w-full justify-center p-6 sm:p-8 md:p-10"></div>
              </div>
            </div>
          </section>

          <section className="py-14 md:py-24">
            <div className="flex flex-row gap-8">
              <div className="-rotate-2 border-4 border-white shadow-sm rounded">
                <img
                  src="https://gratisography.com/wp-content/uploads/2025/04/gratisography-cool-car-cat-1035x780.jpg"
                  className="rounded"
                />
              </div>
              <div className="flex flex-col">
                <Text className="text-lg sm:text-xl font-medium">
                  “Love the fact that those booking meetings can overlay their
                  calendar to easily find a time.{" "}
                  <HighlightedTextPart>
                    Very easy to make multiple calendar links
                  </HighlightedTextPart>{" "}
                  and access them via the Chrome Extension!”
                </Text>
                <Text className="mt-auto text-base sm:text-lg text-gray-800 font-bold">
                  Aman Thakur
                </Text>
                <Text className="text-sm sm:text-base">Founder of Whereby</Text>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-14 md:py-24">
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

            <div className="grid grid-cols-2 grid-rows-2 gap-6 sm:gap-8 mt-8 sm:mt-12">
              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <div className="w-full h-auto aspect-[5/3] bg-blue-500 rounded-lg mb-6"></div>
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  Discover
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Spot Missing Data Instantly
                </Heading>
                <Text className="text-sm sm:text-base">
                  Find missing details like emails, phone numbers, or company
                  profiles.
                </Text>
              </div>

              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <div className="w-full h-auto aspect-[5/3] bg-blue-500 rounded-lg mb-6"></div>
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  Enrich
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Add Verified Information
                </Heading>
                <Text className="text-sm sm:text-base">
                  Pull verified data from trusted sources in real time.
                </Text>
              </div>

              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <div className="w-full h-auto aspect-[5/3] bg-blue-500 rounded-lg mb-6"></div>
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  Validate
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Ensure Every Value Is Right
                </Heading>
                <Text className="text-sm sm:text-base">
                  Check every value for accuracy before finalizing your file.
                </Text>
              </div>

              <div className="border border-gray-200 hover:shadow-sm p-8 rounded-2xl">
                <div className="w-full h-auto aspect-[5/3] bg-blue-500 rounded-lg mb-6"></div>
                <Heading
                  as="h3"
                  className="text-xs sm:text-sm mb-1 text-primary-700"
                >
                  Export
                </Heading>
                <Heading
                  as="h4"
                  className="text-base sm:text-lg font-semibold mb-2"
                >
                  Deliver Data Your Way
                </Heading>
                <Text className="text-sm sm:text-base">
                  Save your dataset as CSV, Excel, or send it to Google Sheets.
                </Text>
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
                    With AICellmate, you can upload your file, select what data
                    you want, and let AI handle the rest.
                  </p>

                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-orange-500 rounded-full mt-1 mr-4 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Smart filling
                        </h4>
                        <p className="text-gray-600">
                          Automatically match the right info to the right row.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-orange-500 rounded-full mt-1 mr-4 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Bulk processing
                        </h4>
                        <p className="text-gray-600">
                          Handle hundreds or thousands of rows at once
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-orange-500 rounded-full mt-1 mr-4 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">
                          Real-time sources
                        </h4>
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
                  AICellmate integrates with Google Sheets, CRMs, data
                  warehouses, and APIs.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                    <p className="text-gray-700">
                      Export to Excel, Sheets, or JSON.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                    <p className="text-gray-700">
                      Connect with Zapier or direct APIs.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-4"></div>
                    <p className="text-gray-700">
                      Keep your data always synced.
                    </p>
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
                AICellmate prioritizes both compliance and correctness. Your
                data stays secure, and every filled entry comes with a
                confidence score so you can trust your results.
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
        </div>
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
                <li>
                  <a href="#" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
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
