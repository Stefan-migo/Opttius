import TestErrorComponent from "@/components/TestErrorComponent";

export default function SentryTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sentry Integration Test
          </h1>
          <p className="text-gray-600">
            This page tests your Sentry error monitoring setup
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              Make sure you've configured your Sentry DSN in{" "}
              <code className="bg-gray-100 px-1 rounded">.env.local</code>
            </li>
            <li>
              Start your development server:{" "}
              <code className="bg-gray-100 px-1 rounded">npm run dev</code>
            </li>
            <li>Visit this page in your browser</li>
            <li>Watch the yellow test component below</li>
            <li>After 2 seconds, an error will be thrown</li>
            <li>Check your Sentry dashboard to see the captured error</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Test Component
          </h2>
          <TestErrorComponent />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This is a demonstration page for Sentry integration testing.</p>
          <p className="mt-1">
            In production, errors will be automatically captured and reported to
            Sentry.
          </p>
        </div>
      </div>
    </div>
  );
}
