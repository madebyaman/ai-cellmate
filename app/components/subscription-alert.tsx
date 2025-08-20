import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { ROUTES } from "~/utils/constants";

interface SubscriptionAlertProps {
  onDismiss?: () => void;
  credits?: number;
  hasValidSubscription?: boolean;
}

export default function SubscriptionAlert({
  onDismiss,
  credits = 0,
  hasValidSubscription = false,
}: SubscriptionAlertProps) {
  const hasNoCredits = credits <= 0;
  
  // Show banner only if: (no credits & no sub) OR (no credits but has sub)
  // Hide if: has credits and no sub
  const shouldShowBanner = (hasNoCredits && !hasValidSubscription) || (hasNoCredits && hasValidSubscription);
  
  if (!shouldShowBanner) {
    return null;
  }
  
  // Priority: no valid subscription first, then no credits
  const message = !hasValidSubscription
    ? "Your subscription has expired or is not active. Please update your billing to continue using all features."
    : "You have no credits remaining. Add more credits to continue using AI features.";
  
  const linkText = !hasValidSubscription ? "Update Billing" : "Add Credits";
  const linkTo = !hasValidSubscription ? ROUTES.BILLING : ROUTES.BILLING_SETTINGS;
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400">
      <div className="flex mx-auto max-w-7xl px-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-4 ml-4" />
        </div>
        <div className="ml-3 flex-1 py-4">
          <p className="text-sm text-yellow-700">
            {message}
          </p>
          <div className="mt-2">
            <Link
              to={linkTo}
              className="font-medium text-yellow-700 underline hover:text-yellow-600 text-sm"
            >
              {linkText}
            </Link>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-400 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
                onClick={onDismiss}
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
