// =========================================================
// Carga de partidos de DIECISEISAVOS (Round of 32) - Mundial 2026
// Del 30 de junio en adelante (los del 28-29 ya estan en produccion)
// =========================================================
// Uso:
//   node scripts/cargar_dieciseisavos.mjs           -> DRY RUN (solo lee y reporta)
//   node scripts/cargar_dieciseisavos.mjs --apply   -> inserta los que falten
//
// Seguridad:
//   - Por defecto NO escribe nada (dry-run).
//   - SOLO inserta partidos nuevos. Dedup por (home_team, away_team, match_date)
//     y por external_id, asi que NUNCA duplica, actualiza ni borra lo existente.
//   - Horas en zona Colombia (UTC-5), igual que el seed original (= hora ET - 1).
//
// Fuente de los cruces: cuadro oficial de eliminatorias del Mundial 2026
// (Wikipedia / FIFA), consultado el 28 de junio de 2026.
// =========================================================

import { readFileSync } from 'node:fs';
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
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const supabase = createClient(url, key);

const STAGE = 'Dieciseisavos de final';

// external_id sintetico (los partidos previos usan null; estos llevan
// un id propio para poder cargar resultados luego de forma idempotente).
// [external_id, fecha, hora COT, local, visitante]
const PARTIDOS = [
  // --- Martes 30 de junio ---
  ['wc2026-r32-78', '2026-06-30', '11:00', 'Costa de Marfil', 'Noruega'],
  ['wc2026-r32-77', '2026-06-30', '16:00', 'Francia', 'Suecia'],
  ['wc2026-r32-79', '2026-06-30', '19:00', 'México', 'Ecuador'],
  // --- Miercoles 1 de julio ---
  ['wc2026-r32-80', '2026-07-01', '11:00', 'Inglaterra', 'RD Congo'],
  ['wc2026-r32-82', '2026-07-01', '15:00', 'Bélgica', 'Senegal'],
  ['wc2026-r32-81', '2026-07-01', '19:00', 'Estados Unidos', 'Bosnia y Herzegovina'],
  // --- Jueves 2 de julio ---
  ['wc2026-r32-84', '2026-07-02', '14:00', 'España', 'Austria'],
  ['wc2026-r32-83', '2026-07-02', '18:00', 'Portugal', 'Croacia'],
  ['wc2026-r32-85', '2026-07-02', '22:00', 'Suiza', 'Argelia'],
  // --- Viernes 3 de julio ---
  ['wc2026-r32-88', '2026-07-03', '12:00', 'Australia', 'Egipto'],
  ['wc2026-r32-86', '2026-07-03', '17:00', 'Argentina', 'Cabo Verde'],
  ['wc2026-r32-87', '2026-07-03', '19:30', 'Colombia', 'Ghana'],
];

const log = (...a) => console.log(...a);
const norm = (s) => (s ?? '').trim().toLowerCase();

async function main() {
  log(`\n=== MODO: ${APPLY ? 'APLICAR (insertar)' : 'DRY RUN (solo lectura)'} ===\n`);

  // 1) Traer TODOS los partidos existentes (para validar nombres y dedup)
  const { data: all, error } = await supabase
    .from('matches')
    .select('external_id, match_date, match_time, home_team, away_team');
  if (error) { console.error('Error leyendo matches:', error.message); process.exit(1); }

  const existingKeys = new Set(
    all.map((m) => `${norm(m.home_team)}|${norm(m.away_team)}|${m.match_date}`),
  );
  const existingExt = new Set(all.map((m) => m.external_id).filter(Boolean));
  const equiposConocidos = new Set();
  for (const m of all) { equiposConocidos.add(norm(m.home_team)); equiposConocidos.add(norm(m.away_team)); }

  // 2) Validar nombres de equipo contra los ya presentes en la BD
  log('--- Validacion de nombres de equipo ---');
  let nombresOk = true;
  for (const [, , , home, away] of PARTIDOS) {
    for (const t of [home, away]) {
      if (!equiposConocidos.has(norm(t))) {
        log(`  !! "${t}" no aparece en la BD (posible typo de nombre)`);
        nombresOk = false;
      }
    }
  }
  if (nombresOk) log('  OK: todos los equipos coinciden con nombres ya existentes.');

  // 3) Calcular cuales faltan
  log('\n--- Partidos a insertar ---');
  const toInsert = [];
  for (const [ext, date, time, home, away] of PARTIDOS) {
    const key = `${norm(home)}|${norm(away)}|${date}`;
    const yaPorEquipos = existingKeys.has(key);
    const yaPorExt = existingExt.has(ext);
    if (yaPorEquipos || yaPorExt) {
      log(`  [omitir] ${date} ${time}  ${home} vs ${away}  (ya existe)`);
    } else {
      log(`  [nuevo ] ${date} ${time}  ${home} vs ${away}`);
      toInsert.push({
        external_id: ext,
        tournament: 'Mundial 2026',
        stage: STAGE,
        group_name: null,
        match_date: date,
        match_time: time,
        home_team: home,
        away_team: away,
        home_score: null,
        away_score: null,
        status: 'scheduled',
      });
    }
  }

  log(`\n  Total definidos: ${PARTIDOS.length} | nuevos a insertar: ${toInsert.length} | ya existentes: ${PARTIDOS.length - toInsert.length}`);

  if (!nombresOk) {
    log('\n*** Hay nombres de equipo no reconocidos. Revisa antes de aplicar. ***');
  }

  if (!APPLY) {
    log('\n*** DRY RUN: no se escribio nada. Revisa y vuelve a correr con --apply ***\n');
    return;
  }

  if (toInsert.length === 0) {
    log('\nNada para insertar. Listo.\n');
    return;
  }

  // 4) Insertar (solo nuevos). insert puro: nunca toca filas existentes.
  const { error: insErr } = await supabase.from('matches').insert(toInsert);
  if (insErr) { console.error('Error insertando:', insErr.message); process.exit(1); }
  log(`\n  ${toInsert.length} partidos insertados.`);
  log('=== LISTO ===\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
