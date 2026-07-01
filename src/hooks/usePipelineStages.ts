import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineStage {
  id: string;
  name: string;
  sort_order: number;
  default_probability: number;
  color: string;
}

/** Etapas do funil — quase nunca mudam, então cacheamos e compartilhamos entre as telas. */
export function usePipelineStages() {
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-stages"],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("sort_order");
      return (data as PipelineStage[]) ?? [];
    },
  });

  return { stages: data ?? [], loading: isLoading };
}
