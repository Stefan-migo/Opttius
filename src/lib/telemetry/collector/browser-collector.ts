import { v4 as uuidv4 } from "uuid";

export interface TelemetryEvent {
  eventId: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  eventType: string;
  source: "frontend" | "backend" | "api" | "system";
  payload: Record<string, any>;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    pageUrl?: string;
    referrer?: string;
    deviceInfo?: DeviceInfo;
    performance?: PerformanceMetrics;
  };
  context: {
    organizationId?: string;
    branchId?: string;
    featureFlags?: string[];
    userRole?: string;
  };
}

export interface DeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  screenWidth: number;
  screenHeight: number;
}

export interface PerformanceMetrics {
  // Frontend Performance
  fcp?: number; // First Contentful Paint (ms)
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte (ms)

  // Backend Performance
  responseTime?: number; // API response time (ms)
  databaseTime?: number; // Database query time (ms)
  cacheHit?: boolean; // Whether request was cached

  // User Experience
  interactionToNextPaint?: number; // INP metric
  totalBlockingTime?: number; // TBT metric
}

export interface QueueItem {
  event: TelemetryEvent;
  retries: number;
  queuedAt: Date;
}

export class TelemetryCollector {
  private eventQueue: QueueItem[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 5000; // 5 seconds
  private maxRetries: number = 3;
  private isFlushing: boolean = false;
  private isEnabled: boolean = true;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options?: { batchSize?: number; flushInterval?: number }) {
    if (options?.batchSize) this.batchSize = options.batchSize;
    if (options?.flushInterval) this.flushInterval = options.flushInterval;

    // Start automatic flushing
    this.startFlushTimer();
  }

  /**
   * Track a page view event
   */
  trackPageView(pageData: {
    pageUrl: string;
    pageTitle?: string;
    referrer?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: pageData.userId,
      sessionId: this.getSessionId(),
      eventType: "page_view",
      source: "frontend",
      payload: {
        pageUrl: pageData.pageUrl,
        pageTitle: pageData.pageTitle,
        referrer: pageData.referrer,
      },
      metadata: {
        pageUrl: pageData.pageUrl,
        referrer: pageData.referrer,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        deviceInfo: this.getDeviceInfo(),
      },
      context: {
        organizationId: pageData.organizationId,
      },
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(
    featureName: string,
    action: string,
    details?: Record<string, any>,
    userId?: string,
  ): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId,
      sessionId: this.getSessionId(),
      eventType: "feature_usage",
      source: "frontend",
      payload: {
        featureName,
        action,
        ...details,
      },
      metadata: {
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        deviceInfo: this.getDeviceInfo(),
      },
      context: {},
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track API requests (server-side)
   */
  trackApiRequest(requestData: {
    requestId: string;
    method: string;
    url: string;
    userAgent?: string;
    ipAddress?: string;
    userId?: string;
    organizationId?: string;
  }): void {
    const event: TelemetryEvent = {
      eventId: requestData.requestId,
      timestamp: new Date(),
      userId: requestData.userId,
      sessionId: this.getSessionId(),
      eventType: "api_request",
      source: "api",
      payload: {
        method: requestData.method,
        url: requestData.url,
      },
      metadata: {
        userAgent: requestData.userAgent,
        ipAddress: requestData.ipAddress,
      },
      context: {
        organizationId: requestData.organizationId,
      },
    };

    this.queueEvent(event);
  }

  /**
   * Track API responses
   */
  trackApiResponse(responseData: {
    requestId: string;
    statusCode: number;
    duration: number;
    responseBodySize?: string;
  }): void {
    const event: TelemetryEvent = {
      eventId: responseData.requestId,
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      eventType: "api_response",
      source: "api",
      payload: {
        statusCode: responseData.statusCode,
        duration: responseData.duration,
        responseBodySize: responseData.responseBodySize,
      },
      metadata: {
        performance: {
          responseTime: responseData.duration,
        },
      },
      context: {},
    };

    this.queueEvent(event);
  }

  /**
   * Track API errors
   */
  trackApiError(errorData: {
    requestId: string;
    error: string;
    stack?: string;
    duration: number;
  }): void {
    const event: TelemetryEvent = {
      eventId: errorData.requestId,
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      eventType: "api_error",
      source: "api",
      payload: {
        error: errorData.error,
        stack: errorData.stack,
        duration: errorData.duration,
      },
      metadata: {},
      context: {},
    };

    this.queueEvent(event);
  }

  /**
   * Track navigation timing
   */
  trackNavigationTiming(timing: any): void {
    const event: TelemetryEvent = {
      eventId: uuidv4(),
      timestamp: new Date(),
      sessionId: this.getSessionId(),
      eventType: "navigation_timing",
      source: "frontend",
      payload: timing,
      metadata: {
        performance: {
          fcp: timing.domContentLoadedEventEnd - timing.navigationStart,
          ttfb: timing.responseStart - timing.navigationStart,
        },
      },
      context: {},
    };

    this.queueEvent(event);
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(interactionData: {
    element: string;
    action: string;
    target?: string;
    value?: string;
    userId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: interactionData.userId,
      sessionId: this.getSessionId(),
      eventType: "user_interaction",
      source: "frontend",
      payload: {
        element: interactionData.element,
        action: interactionData.action,
        target: interactionData.target,
        value: interactionData.value,
      },
      metadata: {
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        deviceInfo: this.getDeviceInfo(),
      },
      context: {},
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Set global telemetry enable status
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      this.eventQueue = [];
    } else if (!this.flushTimer) {
      this.startFlushTimer();
    }
  }

  /**
   * Queue an event for batch processing
   */
  protected queueEvent(event: TelemetryEvent): void {
    if (!this.isEnabled) return;

    const queueItem: QueueItem = {
      event,
      retries: 0,
      queuedAt: new Date(),
    };

    this.eventQueue.push(queueItem);

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  /**
   * Flush events to storage
   */
  async flushEvents(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return;
    }

    this.isFlushing = true;
    let eventsToProcess: QueueItem[] = [];

    try {
      // Get events to process (up to batch size)
      eventsToProcess = this.eventQueue.splice(0, this.batchSize);

      // Send to storage (implement in storage layer)
      await this.sendEvents(eventsToProcess.map((item) => item.event));

      console.log(`Telemetry: Flushed ${eventsToProcess.length} events`);
    } catch (error) {
      console.error("Telemetry: Failed to flush events", error);
      // Re-queue failed events (up to max retries)
      this.handleFailedEvents(eventsToProcess);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Handle failed event transmission
   */
  private handleFailedEvents(failedItems: QueueItem[]): void {
    const retryItems = failedItems
      .filter((item) => item.retries < this.maxRetries)
      .map((item) => ({
        ...item,
        retries: item.retries + 1,
      }));

    // Add back to queue for retry
    this.eventQueue.unshift(...retryItems);

    // Log permanently failed events
    const failedEvents = failedItems.filter(
      (item) => item.retries >= this.maxRetries,
    );
    if (failedEvents.length > 0) {
      console.warn(
        `Telemetry: ${failedEvents.length} events failed permanently`,
      );
    }
  }

  /**
   * Send events to storage via API
   */
  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    try {
      const response = await fetch("/api/admin/app-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(events),
      });

      if (!response.ok) {
        throw new Error(`Failed to send telemetry: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Telemetry storage error:", error);
      throw error;
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Stop automatic flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Flush remaining events
    this.flushEvents();
  }

  /**
   * Get or create session ID
   */
  protected getSessionId(): string {
    if (typeof window !== "undefined") {
      let sessionId = sessionStorage.getItem("telemetry_session_id");
      if (!sessionId) {
        sessionId = uuidv4();
        sessionStorage.setItem("telemetry_session_id", sessionId);
      }
      return sessionId;
    }
    return "server-session-" + uuidv4();
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo | undefined {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    const ua = navigator.userAgent;
    const platform = navigator.platform;

    // Simple device detection (enhance as needed)
    let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
      deviceType = /iPad/.test(ua) ? "tablet" : "mobile";
    }

    return {
      deviceType,
      os: platform,
      browser: this.getBrowserName(ua),
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
    };
  }

  /**
   * Get browser name from user agent
   */
  private getBrowserName(ua: string): string {
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Unknown";
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Force immediate flush
   */
  forceFlush(): Promise<void> {
    return this.flushEvents();
  }
}

// Export singleton instance
export const telemetryCollector = new TelemetryCollector({
  batchSize: 10,
  flushInterval: 5000,
});
