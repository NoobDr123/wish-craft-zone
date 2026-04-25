// Subscribes to Postgres change events on the given tables and invokes
// `onChange` (debounced) whenever any row is inserted, updated, or deleted.
// Used by the admin panel to keep every section live without manual refresh.

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeRefresh(
  tables: string | string[],
  onChange: () => void,
  options: { debounceMs?: number; enabled?: boolean } = {},
) {
  const { debounceMs = 400, enabled = true } = options;
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;
    const list = Array.isArray(tables) ? tables : [tables];
    if (list.length === 0) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), debounceMs);
    };

    const channelName = `admin-rt-${list.join("-")}-${Math.random().toString(36).slice(2, 8)}`;
    let channel = supabase.channel(channelName);
    for (const table of list) {
      channel = channel.on(
        // @ts-expect-error - postgres_changes is a valid event for realtime
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => trigger(),
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(tables) ? tables.join(",") : tables, enabled, debounceMs]);
}
