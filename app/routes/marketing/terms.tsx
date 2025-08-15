import { Link } from "react-router";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <Link to="/" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Home
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing and using AI Cellmate ("the Service"), you accept and
              agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              2. Description of Service
            </h2>
            <p className="text-gray-600 leading-relaxed">
              AI Cellmate provides AI-powered CSV data enrichment services
              through web search and data scraping capabilities.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              3. User Data and Privacy
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We are committed to protecting your privacy. Any data you upload
              for processing is handled securely and is not stored permanently
              on our servers after processing is complete.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              4. Payment and Billing
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Payment processing is handled securely through Stripe. All
              subscription fees are billed in advance on a recurring basis. You
              may cancel your subscription at any time.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              5. Limitation of Liability
            </h2>
            <p className="text-gray-600 leading-relaxed">
              The Service is provided "as is" without warranty of any kind. We
              shall not be liable for any damages arising from the use of this
              Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              6. Termination
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We may terminate or suspend your account and access to the Service
              immediately, without prior notice, for conduct that we believe
              violates these Terms of Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              7. Changes to Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes
              will be effective immediately upon posting to the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">
              8. Contact Information
            </h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms of Service, please
              contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
