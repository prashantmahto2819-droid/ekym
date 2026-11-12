// Untyped client for the level-programme tables/functions (added in Phase 42; not yet in the generated types).
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const sb = supabase as unknown as SupabaseClient;
