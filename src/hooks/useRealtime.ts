"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseRealtimeOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export function useRealtimeTable<T extends Record<string, unknown> = Record<string, unknown>>({
  table,
  schema = "public",
  event = "*",
  filter,
  onPayload,
}: UseRealtimeOptions<T>) {
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    try {
      const channelName = `realtime-${table}-${Math.random().toString(36).substring(7)}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes" as "system",
          {
            event,
            schema,
            table,
            filter,
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            if (!isMounted) return;
            setLastUpdate(new Date());
            if (onPayload) {
              onPayload(payload);
            }
          }
        )
        .subscribe((subscriptionStatus) => {
          if (!isMounted) return;
          if (subscriptionStatus === "SUBSCRIBED") {
            setStatus("connected");
          } else if (subscriptionStatus === "CLOSED") {
            setStatus("disconnected");
          } else if (subscriptionStatus === "CHANNEL_ERROR") {
            setStatus("error");
          }
        });
    } catch {
      if (isMounted) {
        Promise.resolve().then(() => {
          if (isMounted) setStatus("disconnected");
        });
      }
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, schema, event, filter, onPayload]);

  return { status, lastUpdate };
}
