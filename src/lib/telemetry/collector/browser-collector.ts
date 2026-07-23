import { v4 as uuidv4 } from "uuid";

export interface TelemetryEvent {
  eventId: string; timestamp: Date; userId?: string; sessionId: string; eventType: string;
  source: "frontend" | "backend" | "api" | "system"; payload: Record<string, unknown>;
  metadata: { userAgent?: string; ipAddress?: string; pageUrl?: string; referrer?: string; deviceInfo?: DeviceInfo; performance?: PerformanceMetrics };
  context: { organizationId?: string; branchId?: string; featureFlags?: string[]; userRole?: string };
}
export interface DeviceInfo { deviceType: "mobile" | "tablet" | "desktop"; os: string; browser: string; screenWidth: number; screenHeight: number; }
export interface PerformanceMetrics { fcp?: number; lcp?: number; fid?: number; cls?: number; ttfb?: number; responseTime?: number; databaseTime?: number; cacheHit?: boolean; interactionToNextPaint?: number; totalBlockingTime?: number; }
export interface QueueItem { event: TelemetryEvent; retries: number; queuedAt: Date; }

export class TelemetryCollector {
  private eventQueue: QueueItem[] = [];
  private batchSize: number = 10;
  private flushInterval: number = 5000;
  private maxRetries: number = 3;
  private isFlushing: boolean = false;
  private isEnabled: boolean = true;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options?: { batchSize?: number; flushInterval?: number }) {
    if (options?.batchSize) this.batchSize = options.batchSize;
    if (options?.flushInterval) this.flushInterval = options.flushInterval;
    this.startFlushTimer();
  }

  trackPageView(data: { pageUrl: string; pageTitle?: string; referrer?: string; userId?: string; organizationId?: string }): string { return this.queue(this.makeEvent("page_view", "frontend", { pageUrl: data.pageUrl, pageTitle: data.pageTitle, referrer: data.referrer }, data.userId, { organizationId: data.organizationId })); }
  trackFeatureUsage(featureName: string, action: string, details?: Record<string, unknown>, userId?: string): string { return this.queue(this.makeEvent("feature_usage", "frontend", { featureName, action, ...details }, userId)); }
  trackApiRequest(data: { requestId: string; method: string; url: string; userAgent?: string; ipAddress?: string; userId?: string; organizationId?: string }): void { this.queue(this.makeEvent("api_request", "api", { method: data.method, url: data.url }, data.userId, { organizationId: data.organizationId }, data.requestId, { userAgent: data.userAgent, ipAddress: data.ipAddress })); }
  trackApiResponse(data: { requestId: string; statusCode: number; duration: number; responseBodySize?: string }): void { this.queue(this.makeEvent("api_response", "api", { statusCode: data.statusCode, duration: data.duration, responseBodySize: data.responseBodySize }, undefined, undefined, data.requestId, { performance: { responseTime: data.duration } })); }
  trackApiError(data: { requestId: string; error: string; stack?: string; duration: number }): void { this.queue(this.makeEvent("api_error", "api", { error: data.error, stack: data.stack, duration: data.duration }, undefined, undefined, data.requestId)); }
  trackUserInteraction(data: { element: string; action: string; target?: string; value?: string; userId?: string }): string { return this.queue(this.makeEvent("user_interaction", "frontend", { element: data.element, action: data.action, target: data.target, value: data.value }, data.userId)); }
  trackNavigationTiming(timing: unknown): void { this.queue(this.makeEvent("navigation_timing", "frontend", timing, undefined, undefined, undefined, { performance: { fcp: timing.domContentLoadedEventEnd - timing.navigationStart, ttfb: timing.responseStart - timing.navigationStart } })); }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) { if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; } this.eventQueue = []; }
    else if (!this.flushTimer) this.startFlushTimer();
  }

  getQueueSize(): number { return this.eventQueue.length; }
  forceFlush(): Promise<void> { return this.flushEvents(); }
  stop(): void { if (this.flushTimer) { clearInterval(this.flushTimer); this.flushTimer = null; } this.flushEvents(); }

  private makeEvent(eventType: string, source: TelemetryEvent["source"], payload: unknown, userId?: string, context?: unknown, eventId?: string, extraMeta?: unknown): TelemetryEvent {
    return { eventId: eventId || uuidv4(), timestamp: new Date(), userId, sessionId: this.getSessionId(), eventType, source, payload, metadata: { userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined, deviceInfo: this.getDeviceInfo(), ...extraMeta }, context: context || {} };
  }

  private queue(event: TelemetryEvent): string {
    if (!this.isEnabled) return event.eventId;
    this.eventQueue.push({ event, retries: 0, queuedAt: new Date() });
    if (this.eventQueue.length >= this.batchSize) this.flushEvents();
    return event.eventId;
  }

  protected queueEvent(event: TelemetryEvent): void { this.queue(event); }
  protected getSessionId(): string {
    if (typeof window !== "undefined") { let id = sessionStorage.getItem("telemetry_session_id"); if (!id) { id = uuidv4(); sessionStorage.setItem("telemetry_session_id", id); } return id; }
    return "server-session-" + uuidv4();
  }

  private async flushEvents(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) return;
    this.isFlushing = true;
    const eventsToProcess = this.eventQueue.splice(0, this.batchSize);
    try {
      await this.sendEvents(eventsToProcess.map((i) => i.event));
    } catch { this.handleFailed(eventsToProcess); }
    finally { this.isFlushing = false; }
  }

  private handleFailed(items: QueueItem[]): void {
    const retryItems = items.filter((i) => i.retries < this.maxRetries).map((i) => ({ ...i, retries: i.retries + 1 }));
    this.eventQueue.unshift(...retryItems);
  }

  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    const res = await fetch("/api/admin/app-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(events) });
    if (!res.ok) throw new Error(`Failed to send telemetry: ${res.statusText}`);
  }

  private startFlushTimer(): void { this.flushTimer = setInterval(() => this.flushEvents(), this.flushInterval); }
  private getDeviceInfo(): DeviceInfo | undefined {
    if (typeof navigator === "undefined") return undefined;
    const ua = navigator.userAgent;
    let dt: "mobile" | "tablet" | "desktop" = "desktop";
    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) dt = /iPad/.test(ua) ? "tablet" : "mobile";
    return { deviceType: dt, os: navigator.platform, browser: ua.includes("Firefox") ? "Firefox" : ua.includes("Chrome") ? "Chrome" : ua.includes("Safari") ? "Safari" : ua.includes("Edge") ? "Edge" : "Unknown", screenWidth: window.screen?.width || 0, screenHeight: window.screen?.height || 0 };
  }
}

export const telemetryCollector = new TelemetryCollector({ batchSize: 10, flushInterval: 5000 });
