import { useEffect, useRef } from "react";
import type { SSEEventEnvelope, SSEEventType } from "@/lib/types/sse-events";
import { access } from "fs";

type SSEEventHandler = (data: Record<string, unknown>) => void;

interface SSEHandlers {
  onInventoryEvent?: SSEEventHandler;
  onNotification?: SSEEventHandler;
  onAgentTask?: SSEEventHandler;
  onAgentLog?: SSEEventHandler;
  onTaskEvent?: SSEEventHandler;
  onDashboardUpdate?: SSEEventHandler;
}

/**
 * Hook that establishes an EventSource connection to the server's SSE endpoint.
 * Only connects when `enabled` is true (typically after initial data loads).
 *
 * Automatically reconnects on connection loss (native EventSource behavior).
 * Sends periodic heartbeats to keep the connection alive.
 */
export function useSSE(
  enabled: boolean,
  baseUrl: string,
  handlers: SSEHandlers,
  access_token: string
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      eventSource = new EventSource(`${baseUrl}/events?access_token=${access_token}`, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log("[SSE] Connection established");
      };

      eventSource.onmessage = (event) => {
        try {
          const envelope: SSEEventEnvelope = JSON.parse(event.data);
          const h = handlersRef.current;

          switch (envelope.type as SSEEventType) {
            case "inventory_event":
              h.onInventoryEvent?.(envelope.data);
              break;
            case "notification":
              h.onNotification?.(envelope.data);
              break;
            case "agent_task":
              h.onAgentTask?.(envelope.data);
              break;
            case "agent_log":
              h.onAgentLog?.(envelope.data);
              break;
            case "task_event":
              h.onTaskEvent?.(envelope.data);
              break;
            case "dashboard_update":
              h.onDashboardUpdate?.(envelope.data);
              break;
            case "ready":
              console.log("[SSE] Server ready signal received");
              break;
            case "ping":
              // Heartbeat — no action needed
              break;
          }
        } catch (err) {
          console.error("[SSE] Error parsing message:", err);
        }
      };

      eventSource.onerror = () => {
        console.log("[SSE] Connection lost — reconnecting...");
        eventSource?.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [enabled, baseUrl]);
}
