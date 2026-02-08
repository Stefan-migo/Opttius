"use client";

import { useEffect } from "react";

export default function TestErrorComponent() {
  useEffect(() => {
    // This will trigger an error that Sentry should capture
    console.log("Triggering test error...");

    // Simulate an error after component mounts
    setTimeout(() => {
      throw new Error(
        "Test error from Sentry integration - this should appear in your Sentry dashboard",
      );
    }, 2000);
  }, []);

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800">
        Sentry Test Component
      </h3>
      <p className="text-yellow-700 mt-2">
        This component will intentionally throw an error in 2 seconds to test
        Sentry integration.
      </p>
      <p className="text-sm text-yellow-600 mt-2">
        Check your Sentry dashboard after the error occurs.
      </p>
    </div>
  );
}
