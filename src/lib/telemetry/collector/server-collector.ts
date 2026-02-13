import { TelemetryEvent, TelemetryCollector } from './browser-collector';
import { v4 as uuidv4 } from 'uuid';

export class ServerTelemetryCollector extends TelemetryCollector {
  /**
   * Track database query performance
   */
  trackDatabaseQuery(queryData: {
    queryName: string;
    duration: number;
    rowCount?: number;
    error?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: queryData.userId,
      sessionId: this.getSessionId(),
      eventType: 'database_query',
      source: 'backend',
      payload: {
        queryName: queryData.queryName,
        duration: queryData.duration,
        rowCount: queryData.rowCount,
        error: queryData.error
      },
      metadata: {
        performance: {
          databaseTime: queryData.duration
        }
      },
      context: {
        organizationId: queryData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track business workflow completion
   */
  trackWorkflow(workflowData: {
    workflowName: string;
    step: string;
    status: 'started' | 'completed' | 'failed';
    duration?: number;
    error?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: workflowData.userId,
      sessionId: this.getSessionId(),
      eventType: 'workflow_' + workflowData.status,
      source: 'backend',
      payload: {
        workflowName: workflowData.workflowName,
        step: workflowData.step,
        status: workflowData.status,
        duration: workflowData.duration,
        error: workflowData.error
      },
      metadata: workflowData.duration ? {
        performance: {
          responseTime: workflowData.duration
        }
      } : {},
      context: {
        organizationId: workflowData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track user authentication events
   */
  trackAuthEvent(authData: {
    action: 'login' | 'logout' | 'failed_login' | 'password_reset';
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    error?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: authData.userId,
      sessionId: this.getSessionId(),
      eventType: 'auth_' + authData.action,
      source: 'backend',
      payload: {
        action: authData.action,
        error: authData.error
      },
      metadata: {
        ipAddress: authData.ipAddress,
        userAgent: authData.userAgent
      },
      context: {
        organizationId: authData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track payment processing events
   */
  trackPaymentEvent(paymentData: {
    paymentId: string;
    gateway: string;
    amount: number;
    currency: string;
    status: 'initiated' | 'completed' | 'failed' | 'refunded';
    duration?: number;
    error?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: paymentData.userId,
      sessionId: this.getSessionId(),
      eventType: 'payment_' + paymentData.status,
      source: 'backend',
      payload: {
        paymentId: paymentData.paymentId,
        gateway: paymentData.gateway,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentData.status,
        duration: paymentData.duration,
        error: paymentData.error
      },
      metadata: paymentData.duration ? {
        performance: {
          responseTime: paymentData.duration
        }
      } : {},
      context: {
        organizationId: paymentData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track file upload/download operations
   */
  trackFileOperation(operationData: {
    operation: 'upload' | 'download';
    fileName: string;
    fileSize: number;
    fileType: string;
    duration?: number;
    error?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: operationData.userId,
      sessionId: this.getSessionId(),
      eventType: 'file_' + operationData.operation,
      source: 'backend',
      payload: {
        operation: operationData.operation,
        fileName: operationData.fileName,
        fileSize: operationData.fileSize,
        fileType: operationData.fileType,
        duration: operationData.duration,
        error: operationData.error
      },
      metadata: operationData.duration ? {
        performance: {
          responseTime: operationData.duration
        }
      } : {},
      context: {
        organizationId: operationData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track email sending operations
   */
  trackEmailEvent(emailData: {
    template: string;
    recipientCount: number;
    status: 'sent' | 'failed';
    error?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: emailData.userId,
      sessionId: this.getSessionId(),
      eventType: 'email_' + emailData.status,
      source: 'backend',
      payload: {
        template: emailData.template,
        recipientCount: emailData.recipientCount,
        status: emailData.status,
        error: emailData.error
      },
      metadata: {},
      context: {
        organizationId: emailData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track cache operations
   */
  trackCacheOperation(cacheData: {
    operation: 'hit' | 'miss' | 'set' | 'delete';
    key: string;
    duration?: number;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: cacheData.userId,
      sessionId: this.getSessionId(),
      eventType: 'cache_' + cacheData.operation,
      source: 'backend',
      payload: {
        operation: cacheData.operation,
        key: cacheData.key,
        duration: cacheData.duration
      },
      metadata: cacheData.duration ? {
        performance: {
          responseTime: cacheData.duration
        }
      } : {},
      context: {
        organizationId: cacheData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Track external API calls
   */
  trackExternalApiCall(apiData: {
    service: string;
    endpoint: string;
    method: string;
    duration: number;
    statusCode?: number;
    error?: string;
    userId?: string;
    organizationId?: string;
  }): string {
    const eventId = uuidv4();

    const event: TelemetryEvent = {
      eventId,
      timestamp: new Date(),
      userId: apiData.userId,
      sessionId: this.getSessionId(),
      eventType: 'external_api_call',
      source: 'backend',
      payload: {
        service: apiData.service,
        endpoint: apiData.endpoint,
        method: apiData.method,
        duration: apiData.duration,
        statusCode: apiData.statusCode,
        error: apiData.error
      },
      metadata: {
        performance: {
          responseTime: apiData.duration
        }
      },
      context: {
        organizationId: apiData.organizationId
      }
    };

    this.queueEvent(event);
    return eventId;
  }

  /**
   * Generate server session ID
   */
  protected getSessionId(): string {
    // For server-side, we'll generate a new session ID for each request context
    // In a real implementation, this would come from request context or user session
    return 'server-session-' + uuidv4();
  }
}

// Export singleton instance
export const serverTelemetryCollector = new ServerTelemetryCollector({
  batchSize: 20,  // Larger batch size for server
  flushInterval: 10000  // Longer flush interval for server
});