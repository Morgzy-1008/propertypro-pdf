import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function reset() {
  console.log("Deleting all records from facade_renders...");
  
  // Since we might not have the service role key, we can try to delete where id is not null.
  // Note: if RLS is enabled, this might fail unless we use the service role key.
  const { data, error } = await supabase
    .from('facade_renders')
    .delete()
    .neq('id', 'dummy_id_that_does_not_exist'); // Delete all

  if (error) {
    console.error("Error deleting records:", error);
  } else {
    console.log("Successfully deleted all saved renders.");
  }
}

reset();
