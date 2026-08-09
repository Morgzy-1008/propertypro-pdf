import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function run() {
  const env = fs.readFileSync('.env', 'utf8');
  const urlMatch = env.match(/VITE_SUPABASE_URL="?(.*?)"?(?:\n|$)/);
  const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?(.*?)"?(?:\n|$)/);
  
  if (!urlMatch || !keyMatch) {
    console.error("Could not parse env vars");
    return;
  }
  
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  console.log("Fetching facade_renders...");
  const { data, error } = await supabase.from('facade_renders').select('id');
  if (error) {
    console.error("Error fetching:", error);
    return;
  }
  
  console.log(`Found ${data.length} renders. Deleting them to refresh...`);
  
  if (data.length > 0) {
    const ids = data.map(d => d.id);
    const { error: delError } = await supabase.from('facade_renders').delete().in('id', ids);
    if (delError) {
      console.error("Error deleting:", delError);
    } else {
      console.log("Successfully deleted all Supabase renders.");
    }
  } else {
    console.log("No renders to delete.");
  }
}

run();
