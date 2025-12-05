import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface AbandonedEvent {
  id: string;
  event_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_document: string | null;
  amount: number | null;
  product_name: string | null;
  funnel_stage: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function useAbandonedEvents() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ["abandoned-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AbandonedEvent[];
    },
  });

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("abandoned-events-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "abandoned_events",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["abandoned-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from("abandoned_events")
      .delete()
      .eq("id", id);

    if (error) throw error;
    refetch();
  };

  return {
    events,
    isLoading,
    refetch,
    deleteEvent,
  };
}
