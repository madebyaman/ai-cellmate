import { Link } from "react-router";

export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Coming Soon</h1>
          <p className="text-xl text-gray-600">
            AI Cellmate is launching soon! Get ready to supercharge your data
            with AI-powered enrichment.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              What to expect:
            </h2>
            <ul className="text-left space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Intelligent CSV data enrichment
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                AI-powered web search integration
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                Automated data discovery and completion
              </li>
            </ul>
          </div>

          <div className="text-sm text-gray-500 space-y-2">
            <p>
              By using our service, you agree to our{" "}
              <Link
                to="/terms"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
