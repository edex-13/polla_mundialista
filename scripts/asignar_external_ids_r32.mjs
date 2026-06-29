// =========================================================
// Asigna external_id + stage a los 4 partidos de dieciseisavos
// que entraron manualmente sin external_id (28-29 de junio).
// =========================================================
// Uso:
//   node scripts/asignar_external_ids_r32.mjs          -> DRY RUN
//   node scripts/asignar_external_ids_r32.mjs --apply  -> aplica
//
// Seguridad: SOLO actualiza external_id y stage de filas que matchean
// EXACTO por (home_team, away_team, match_date) y que hoy tienen
// external_id NULL. No borra ni cambia equipos, marcadores ni nada mas.
// =========================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv() {
  const raw = readFileSync(join(root, '.env'), 'utf8');
  const env = {};
  for (const l of raw.split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const APPLY = process.argv.includes('--apply');
const STAGE = 'Dieciseisavos de final';

// [external_id, fecha, local, visitante]
const MAP = [
  ['wc2026-r32-73', '2026-06-28', 'Sudáfrica', 'Canadá'],
  ['wc2026-r32-74', '2026-06-29', 'Alemania', 'Paraguay'],
  ['wc2026-r32-75', '2026-06-29', 'Países Bajos', 'Marruecos'],
  ['wc2026-r32-76', '2026-06-29', 'Brasil', 'Japón'],
];

async function main() {
  console.log(`\n=== MODO: ${APPLY ? 'APLICAR' : 'DRY RUN'} ===\n`);
  let okAll = true;
  for (const [ext, date, home, away] of MAP) {
    const { data, error } = await supabase
      .from('matches')
      .select('id, external_id, home_team, away_team, match_date')
      .eq('match_date', date)
      .eq('home_team', home)
      .eq('away_team', away);
    if (error) { console.error('Error:', error.message); process.exit(1); }
    if (!data || data.length !== 1) {
      console.log(`  [SALTAR] ${home} vs ${away} (${date}) -> encontrados: ${data?.length ?? 0}`);
      okAll = false;
      continue;
    }
    const row = data[0];
    if (row.external_id && row.external_id !== ext) {
      console.log(`  [SALTAR] ${home} vs ${away} ya tiene external_id="${row.external_id}"`);
      continue;
    }
    if (row.external_id === ext) { console.log(`  [OK ya] ${home} vs ${away} -> ${ext}`); continue; }
    console.log(`  [ASIGNAR] ${home} vs ${away} (${date}) -> ${ext}`);
    if (APPLY) {
      const { error: upErr } = await supabase
        .from('matches')
        .update({ external_id: ext, stage: STAGE })
        .eq('id', row.id)
        .is('external_id', null); // solo si sigue null (no pisa nada)
      if (upErr) { console.error('  Error update:', upErr.message); process.exit(1); }
    }
  }
  if (!APPLY) console.log('\n*** DRY RUN: nada escrito. Corre con --apply ***\n');
  else console.log('\n=== LISTO ===\n');
  if (!okAll) console.log('(Revisa los [SALTAR]: nombres/fechas que no matchearon exacto)');
}
main().catch((e) => { console.error(e); process.exit(1); });
