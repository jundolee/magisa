import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface SourceSuggestion {
  id: string;
  url: string;
  note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export async function insertSourceSuggestion(url: string, note: string | null): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("source_suggestions").insert({ url, note });
  if (error) throw error;
}

export async function listPendingSourceSuggestions(): Promise<SourceSuggestion[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("source_suggestions")
    .select("*")
    .is("reviewed_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SourceSuggestion[];
}

export async function markSourceSuggestionReviewed(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("source_suggestions")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
