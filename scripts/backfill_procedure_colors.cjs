const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// New PROCEDURE_COLORS tints (source of truth: src/lib/types-calendar.ts).
// Old → new pairs: only these shifted in the rebalance.
const REPAINT = [
  { procedure: 'Ortodoncia', new: '#ec4899' }, // was #7c3aed (clashed with Endodoncia)
  { procedure: 'Radiografía', new: '#64748b' }, // was #2563eb (clashed with Chequeo)
  { procedure: 'Implante', new: '#f97316' }, // was #0d9488 (clashed with Limpieza)
  { procedure: 'Promo 3 tapones', new: '#ca8a04' }, // was #d97706 (clashed with Extracción)
  { procedure: 'Limpieza + 3 tapones', new: '#06b6d4' }, // was #059669 (clashed with Restauraciones)
  { procedure: 'Blanqueamiento', new: '#0ea5e9' }, // was #059669 (clashed with Restauraciones)
];

(async () => {
  for (const { procedure, new: hex } of REPAINT) {
    const before = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('procedure', procedure)
      .neq('color', hex);
    if (before.error) { console.error('count failed', procedure, before.error.message); process.exit(1); }
    const affected = before.count ?? 0;
    if (affected === 0) { console.log(`SKIP ${procedure} — 0 to update`); continue; }

    const { error } = await supabase
      .from('events')
      .update({ color: hex })
      .eq('procedure', procedure)
      .neq('color', hex);
    if (error) { console.error('UPDATE FAILED', procedure, error.message); process.exit(1); }
    console.log(`${procedure}: updated ${affected} → ${hex}`);
  }
  console.log('Backfill complete.');
})();