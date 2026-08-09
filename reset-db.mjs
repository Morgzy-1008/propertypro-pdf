import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qdzvdpkzwhpchyvpflmd.supabase.co',
  process.env.SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('facade_renders').select('id');
  if (error) {
    console.error('Select Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    for (const row of data) {
       const { error: delErr } = await supabase.from('facade_renders').delete().eq('id', row.id);
       if (delErr) console.error('Delete error for', row.id, delErr);
       else console.log('Deleted', row.id);
    }
  } else {
    console.log('No facades found.');
  }
}
run();
