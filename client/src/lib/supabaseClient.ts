import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://icxcxybjuyykpdojakwv.supabase.co";
const supabaseAnonKey = "sb_publishable_yFBcJu2U781LI95Uu20eww_1KQ75IV3";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);