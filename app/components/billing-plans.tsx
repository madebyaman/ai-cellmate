const billingPlans = [
  {
    name: "Starter Plan",
    price: "$49",
    period: "/month",
    description: "For individuals starting with automation",
    features: [
      { text: "200 Credits / month", enabled: true },
      { text: "Unlimited Projects", enabled: true },
      { text: "Standard processing speed", enabled: true },
      { text: "Export to CSV, TXT, Excel", enabled: true },
      { text: "Standard customer support", enabled: true },
      { text: "No faster processing", enabled: false },
      { text: "No team collaboration", enabled: false },
      { text: "Zapier Integration", enabled: false },
    ],
    buttonText: "Choose Starter",
    isCurrentPlan: false,
  },
  {
    name: "Pro Plan",
    price: "$99",
    period: "/month",
    description: "Best for professionals and power users",
    features: [
      { text: "500 Credits / month", enabled: true },
      { text: "Unlimited Projects", enabled: true },
      { text: "Faster processing (priority queue)", enabled: true },
      { text: "Export to CSV, TXT, Excel, JSON", enabled: true },
      { text: "Priority customer support", enabled: true },
      { text: "Team collaboration (invite 2 members)", enabled: true },
      { text: "Zapier integrations", enabled: true },
      { text: "Early access to beta features", enabled: true },
    ],
    buttonText: "Upgrade to Pro",
    isCurrentPlan: false,
  },
] as const;

import { CheckIcon, ArrowUpIcon } from "lucide-react";
import { Button } from "./ui/button";

export function BillingPlans() {
  return (
    <div className="flex gap-6 max-w-4xl mx-auto">
      {billingPlans.map((plan) => (
        <div
          key={plan.name}
          className="flex-1 bg-white rounded-lg border border-gray-200 p-6 flex flex-col"
        >
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {plan.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-gray-900">
                {plan.price}
              </span>
              <span className="text-sm text-gray-500 ml-1">{plan.period}</span>
            </div>
          </div>

          {/* Features */}
          <div className="mb-8 flex-1">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Features</h4>
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                      feature.enabled
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <CheckIcon className="w-3 h-3" />
                  </div>
                  <span
                    className={`text-sm ${
                      feature.enabled ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Button */}
          <Button variant="outline">
            {!plan.isCurrentPlan && <ArrowUpIcon className="w-4 h-4" />}
            {plan.buttonText}
            {plan.isCurrentPlan && <CheckIcon className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      ))}
    </div>
  );
}
