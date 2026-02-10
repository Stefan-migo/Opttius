'use client';

import React, { useEffect } from 'react';
import { useTelemetry } from '@/lib/telemetry/hooks/use-telemetry';

export default function TestTelemetryPage() {
  const { trackFeatureUsage } = useTelemetry('test-page');
  
  useEffect(() => {
    trackFeatureUsage('page_load', { test: 'successful' });
  }, [trackFeatureUsage]);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Telemetry Test Page</h1>
      <p>If you can see this page without errors, the telemetry imports are working!</p>
      <button 
        onClick={() => trackFeatureUsage('test_button_click', { timestamp: Date.now() })}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Tracking
      </button>
    </div>
  );
}