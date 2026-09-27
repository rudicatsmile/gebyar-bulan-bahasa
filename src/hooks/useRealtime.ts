"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  filter?: string;
  onPayload?: (payload: any) => void;
}

export function useRealtimeTable({
  table,
  schema = "public",
  event = "*",
  filter,
  onPayload,
}: UseRealtimeOptions) {
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    try {
      const channelName = `realtime-${table}-${Math.random().toString(36).substring(7)}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes" as any,
          {
            event,
            schema,
            table,
            filter,
          },
          (payload: any) => {
            setLastUpdate(new Date());
            if (onPayload) {
              onPayload(payload);
            }
          }
        )
        .subscribe((subscriptionStatus) => {
          if (subscriptionStatus === "SUBSCRIBED") {
            setStatus("connected");
          } else if (subscriptionStatus === "CLOSED") {
            setStatus("disconnected");
          } else if (subscriptionStatus === "CHANNEL_ERROR") {
            setStatus("error");
          }
        });
    } catch {
      setStatus("disconnected");
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, schema, event, filter, onPayload]);

  return { status, lastUpdate };
}
