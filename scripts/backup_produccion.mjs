// =========================================================
// BACKUP de produccion -> archivos JSON en tu PC
// =========================================================
// Uso:  node scripts/backup_produccion.mjs
// Crea:  backups/backup_<YYYYMMDD_HHMMSS>/<tabla>.json  (+ un _manifest.json)
// Solo LECTURA. No modifica nada en la base.
// =========================================================

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const raw = readFileSync(join(root, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Tablas/vistas a respaldar
const TABLAS = [
  'players',
  'matches',
  'predictions',
  'tournament_predictions',
  'tournament_result',
  'group_predictions',
  'group_results',
];

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function dumpTable(name) {
  // Paginado por si hay muchas filas (limite del API ~1000 por request)
  const pageSize = 1000;
  let from = 0;
  let all = [];
  for (;;) {
    const { data, error } = await supabase
      .from(name)
      .select('*')
      .range(from, from + pageSize - 1);
    if (error) return { error: error.message };
    all = all.concat(data ?? []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return { rows: all };
}

async function main() {
  const dir = join(root, 'backups', `backup_${stamp()}`);
  mkdirSync(dir, { recursive: true });
  console.log(`\nBackup -> ${dir}\n`);

  const manifest = { created_at: new Date().toISOString(), tables: {} };

  for (const t of TABLAS) {
    const res = await dumpTable(t);
    if (res.error) {
      console.log(`  ${t.padEnd(24)} ERROR: ${res.error}`);
      manifest.tables[t] = { error: res.error };
      continue;
    }
    const file = join(dir, `${t}.json`);
    writeFileSync(file, JSON.stringify(res.rows, null, 2), 'utf8');
    console.log(`  ${t.padEnd(24)} ${String(res.rows.length).padStart(5)} filas`);
    manifest.tables[t] = { rows: res.rows.length, file: `${t}.json` };
  }

  writeFileSync(join(dir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nManifest: ${join(dir, '_manifest.json')}`);
  console.log('\n=== BACKUP COMPLETO ===\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
