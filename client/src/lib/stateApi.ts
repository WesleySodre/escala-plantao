import { supabase } from "./supabaseClient";

export type AppStateRow = {
  id: number;
  data: any;
  updated_at: string;
};

export async function loadAppState(): Promise<any> {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return data?.data ?? {};
}
