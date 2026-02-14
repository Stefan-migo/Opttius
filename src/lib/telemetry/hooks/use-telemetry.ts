import { useEffect, useCallback, useRef } from "react";
import { telemetryCollector } from "../collector/browser-collector";

/**
 * Hook for tracking page views automatically
 */
export function usePageTracking() {
  useEffect(() => {
    // Track page view when component mounts
    const pageViewId = telemetryCollector.trackPageView({
      pageUrl: typeof window !== "undefined" ? window.location.pathname : "/",
      pageTitle: typeof document !== "undefined" ? document.title : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
    });

    // Clean up when component unmounts
    return () => {
      // Could track page leave time here if needed
    };
  }, []); // Empty dependency array means this runs once per page load
}

/**
 * Hook for tracking feature usage
 */
export function useFeatureTracking(featureName: string) {
  const trackInteraction = useCallback(
    (action: string, details?: any) => {
      telemetryCollector.trackFeatureUsage(featureName, action, details);
    },
    [featureName],
  );

  // Also provide a direct feature usage tracker
  const trackFeatureUsage = useCallback(
    (action: string, details?: any) => {
      telemetryCollector.trackFeatureUsage(featureName, action, details);
    },
    [featureName],
  );

  return { trackInteraction, trackFeatureUsage };
}

/**
 * Hook for tracking user interactions with DOM elements
 */
export function useInteractionTracking() {
  const trackClick = useCallback(
    (elementName: string, target?: string, value?: string) => {
      telemetryCollector.trackUserInteraction({
        element: elementName,
        action: "click",
        target,
        value,
      });
    },
    [],
  );

  const trackInputChange = useCallback(
    (elementName: string, value?: string) => {
      telemetryCollector.trackUserInteraction({
        element: elementName,
        action: "input",
        value,
      });
    },
    [],
  );

  return { trackClick, trackInputChange };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMetrics() {
  useEffect(() => {
    // Only run in browser environment
    if (
      typeof window === "undefined" ||
      typeof PerformanceObserver === "undefined"
    ) {
      return;
    }

    // Track Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case "navigation":
            telemetryCollector.trackNavigationTiming(entry.toJSON());
            break;

          case "paint":
            if (entry.name === "first-contentful-paint") {
              telemetryCollector.trackUserInteraction({
                element: "performance",
                action: "fcp_measured",
                value: entry.startTime.toString(),
              });
            }
            break;

          case "largest-contentful-paint":
            if (entry.name === "largest-contentful-paint") {
              telemetryCollector.trackUserInteraction({
                element: "performance",
                action: "lcp_measured",
                value: entry.startTime.toString(),
              });
            }
            break;
        }
      });
    });

    try {
      observer.observe({
        entryTypes: ["navigation", "paint", "largest-contentful-paint"],
      });
    } catch (error) {
      console.warn("Performance Observer not supported:", error);
    }

    // Cleanup observer
    return () => {
      observer.disconnect();
    };
  }, []);
}

/**
 * Hook for measuring component render performance
 */
export function useRenderTracking(componentName: string) {
  const renderStartTime = useRef<number | null>(null);

  useEffect(() => {
    renderStartTime.current = performance.now();

    return () => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        telemetryCollector.trackUserInteraction({
          element: componentName,
          action: "component_render",
          value: renderTime.toString(),
        });
      }
    };
  }, [componentName]);
}

/**
 * Hook for tracking form submissions
 */
export function useFormTracking(formName: string) {
  const trackFormStart = useCallback(() => {
    telemetryCollector.trackUserInteraction({
      element: formName,
      action: "form_start",
    });
  }, [formName]);

  const trackFormSubmit = useCallback(
    (success: boolean, error?: string) => {
      telemetryCollector.trackUserInteraction({
        element: formName,
        action: success ? "form_submit_success" : "form_submit_error",
        value: error,
      });
    },
    [formName],
  );

  const trackFormField = useCallback(
    (fieldName: string, action: string) => {
      telemetryCollector.trackUserInteraction({
        element: `${formName}_${fieldName}`,
        action: `field_${action}`,
      });
    },
    [formName],
  );

  return { trackFormStart, trackFormSubmit, trackFormField };
}

/**
 * Hook for tracking search functionality
 */
export function useSearchTracking(searchContext: string) {
  const trackSearch = useCallback(
    (query: string, resultCount?: number) => {
      telemetryCollector.trackUserInteraction({
        element: searchContext,
        action: "search_executed",
        value: query,
        target: resultCount?.toString(),
      });
    },
    [searchContext],
  );

  const trackSearchResultClick = useCallback(
    (resultId: string, position: number) => {
      telemetryCollector.trackUserInteraction({
        element: searchContext,
        action: "search_result_click",
        value: resultId,
        target: position.toString(),
      });
    },
    [searchContext],
  );

  return { trackSearch, trackSearchResultClick };
}

/**
 * Hook for tracking navigation between pages/routes
 */
export function useNavigationTracking() {
  const trackNavigation = useCallback(
    (from: string, to: string, method: string) => {
      telemetryCollector.trackUserInteraction({
        element: "navigation",
        action: method,
        target: from,
        value: to,
      });
    },
    [],
  );

  return trackNavigation;
}

/**
 * Hook for tracking error boundaries and caught errors
 */
export function useErrorTracking(componentName: string) {
  const trackError = useCallback(
    (error: Error, errorInfo?: any) => {
      telemetryCollector.trackUserInteraction({
        element: componentName,
        action: "error_caught",
        value: error.message,
        target: error.name,
      });
    },
    [componentName],
  );

  return trackError;
}

/**
 * Comprehensive hook that combines multiple tracking capabilities
 */
export function useTelemetry(componentName: string) {
  // Initialize all tracking hooks
  usePageTracking();
  usePerformanceMetrics();
  useRenderTracking(componentName);

  const { trackFeatureUsage: featureTrackUsage } =
    useFeatureTracking(componentName);
  const interactionTracking = useInteractionTracking();
  const formTracking = useFormTracking(componentName);
  const searchTracking = useSearchTracking(componentName);
  const navigationTracking = useNavigationTracking();
  const errorTracking = useErrorTracking(componentName);

  return {
    ...interactionTracking,
    ...formTracking,
    ...searchTracking,
    trackFeatureUsage: featureTrackUsage,
    trackNavigation: navigationTracking,
    trackError: errorTracking,
    telemetryCollector,
  };
}
