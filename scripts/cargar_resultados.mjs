// =========================================================
// Carga de resultados reales + pronosticos (Mundial 2026)
// =========================================================
// Uso:
//   node scripts/cargar_resultados.mjs            -> DRY RUN (solo lee y reporta, NO escribe)
//   node scripts/cargar_resultados.mjs --apply    -> aplica cambios (no sobrescribe pronosticos existentes)
//   node scripts/cargar_resultados.mjs --apply --overwrite-predicciones
//                                                 -> ademas sobrescribe pronosticos que ya existan
//
// Seguridad:
//   - Por defecto NO escribe nada (dry-run).
//   - Los marcadores reales solo se aplican si el partido NO esta ya
//     'finished' con un marcador distinto (se reporta cualquier conflicto).
//   - Los pronosticos existentes NO se tocan salvo --overwrite-predicciones.
// =========================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// --- cargar .env manualmente ---
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
const OVERWRITE = process.argv.includes('--overwrite-predicciones');

const supabase = createClient(url, key);

// --- Resultados reales (orientacion del seed) ---
// external_id -> [home, away]
const RESULTADOS = {
  '66456904': [2, 0], // Mexico - Sudafrica
  '66456906': [2, 1], // Corea del Sur - Chequia
  '66456916': [1, 1], // Canada - Bosnia
  '66456918': [1, 1], // Catar - Suiza
  '66456928': [1, 1], // Brasil - Marruecos
  '66456940': [4, 1], // Estados Unidos - Paraguay
  '66456930': [0, 1], // Haiti - Escocia
  '66456942': [2, 0], // Australia - Turquia
  '66457070': [7, 1], // Alemania - Curazao
  '66456968': [2, 2], // Paises Bajos - Japon
  '66457072': [1, 0], // Costa de Marfil - Ecuador
  '66456970': [5, 1], // Suecia - Tunez
  '66456982': [1, 1], // Belgica - Egipto
  '66456984': [2, 2], // Iran - Nueva Zelanda
  '66456994': [0, 0], // Espana - Cabo Verde
  '66456996': [1, 1], // Arabia Saudita - Uruguay (INVERTIDO desde "Uruguay vs Saudi")
};

// --- Pronosticos: [player_name, external_id, ph, pa] en orientacion del seed ---
// (el partido 66456996 ya viene invertido home<->away)
const PRONOSTICOS = [
  // Ricardo
  ['Ricardo','66456904',2,1],['Ricardo','66456906',1,1],['Ricardo','66456916',2,0],
  ['Ricardo','66456918',0,2],['Ricardo','66456928',2,0],['Ricardo','66456940',1,1],
  ['Ricardo','66456930',0,2],['Ricardo','66456942',0,2],['Ricardo','66457070',3,0],
  ['Ricardo','66456968',1,1],['Ricardo','66457072',0,2],['Ricardo','66456970',2,0],
  ['Ricardo','66456982',2,0],['Ricardo','66456984',1,2],['Ricardo','66456994',3,0],
  ['Ricardo','66456996',0,2],
  // Andres
  ['Andrés','66456904',2,1],['Andrés','66456906',1,0],['Andrés','66456916',1,0],
  ['Andrés','66456918',0,1],['Andrés','66456928',3,0],['Andrés','66456940',0,2],
  ['Andrés','66456930',0,1],['Andrés','66456942',1,2],['Andrés','66456968',1,2],
  ['Andrés','66457072',0,2],['Andrés','66456970',2,1],
  // Virginia
  ['Virginia','66456904',2,2],['Virginia','66456906',2,1],['Virginia','66456916',1,1],
  ['Virginia','66456918',1,1],['Virginia','66456928',3,0],['Virginia','66456940',3,2],
  ['Virginia','66456930',1,1],['Virginia','66456942',2,2],['Virginia','66457070',3,2],
  ['Virginia','66456968',0,2],['Virginia','66457072',1,3],['Virginia','66456982',1,0],
  ['Virginia','66456984',2,2],['Virginia','66456994',3,0],['Virginia','66456996',2,2],
  // Alexandra
  ['Alexandra','66456904',2,0],['Alexandra','66456906',1,0],['Alexandra','66456916',1,1],
  ['Alexandra','66456940',0,1],
  // Ederson
  ['Ederson','66456904',2,0],['Ederson','66456906',1,1],['Ederson','66456916',3,0],
  ['Ederson','66456918',0,2],['Ederson','66456928',2,1],['Ederson','66456940',2,1],
  ['Ederson','66456930',0,2],['Ederson','66456942',0,3],['Ederson','66457070',5,1],
  ['Ederson','66456968',2,1],['Ederson','66457072',1,1],['Ederson','66456970',2,0],
  ['Ederson','66456982',2,0],['Ederson','66456984',1,0],['Ederson','66456996',1,2],
  // Sebastian
  ['Sebastian','66456904',2,0],['Sebastian','66456906',2,0],['Sebastian','66456916',1,0],
  ['Sebastian','66456918',0,4],['Sebastian','66456928',1,2],['Sebastian','66456940',2,1],
  ['Sebastian','66456930',0,3],['Sebastian','66456942',1,3],['Sebastian','66457070',4,0],
  ['Sebastian','66456968',1,2],
  // Jean Pierre
  ['Jean Pierre','66456904',2,1],['Jean Pierre','66456906',2,2],['Jean Pierre','66456916',2,1],
  ['Jean Pierre','66456940',0,2],
  // Cristian
  ['Cristian','66456904',2,0],['Cristian','66456906',2,1],['Cristian','66456916',2,1],
  ['Cristian','66456940',1,0],
  // Simon
  ['Simon','66456904',2,1],['Simon','66456906',2,1],['Simon','66456916',1,0],
  ['Simon','66456940',1,3],
  // Lucerito
  ['Lucerito','66456904',2,1],['Lucerito','66456906',1,1],['Lucerito','66456916',2,1],
  ['Lucerito','66456940',2,0],['Lucerito','66457070',2,0],['Lucerito','66456968',2,1],
  ['Lucerito','66457072',0,1],['Lucerito','66456982',2,0],['Lucerito','66456994',2,0],
  ['Lucerito','66456996',1,2],
  // Tatiana
  ['Tatiana','66456904',2,0],['Tatiana','66456906',1,1],['Tatiana','66456916',2,1],
  ['Tatiana','66456940',1,0],
];

const log = (...a) => console.log(...a);
const externalIds = Object.keys(RESULTADOS);

async function main() {
  log(`\n=== MODO: ${APPLY ? 'APLICAR CAMBIOS' : 'DRY RUN (solo lectura)'} ===\n`);

  // 1) Cargar partidos involucrados
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('id, external_id, home_team, away_team, home_score, away_score, status')
    .in('external_id', externalIds);
  if (mErr) { console.error('Error leyendo matches:', mErr.message); process.exit(1); }

  const byExt = new Map(matches.map((m) => [m.external_id, m]));
  const faltantes = externalIds.filter((e) => !byExt.has(e));
  if (faltantes.length) {
    console.error('!! external_id no encontrados en BD:', faltantes.join(', '));
    process.exit(1);
  }

  // 2) Cargar jugadores involucrados
  const nombres = [...new Set(PRONOSTICOS.map((p) => p[0]))];
  const { data: players, error: pErr } = await supabase
    .from('players').select('id, name').in('name', nombres);
  if (pErr) { console.error('Error leyendo players:', pErr.message); process.exit(1); }
  const byName = new Map(players.map((p) => [p.name, p]));
  const sinJugador = nombres.filter((n) => !byName.has(n));
  if (sinJugador.length) {
    console.error('!! Jugadores no encontrados en BD:', sinJugador.join(', '));
    process.exit(1);
  }

  // 3) Cargar predicciones existentes de esos jugadores en esos partidos
  const matchIds = matches.map((m) => m.id);
  const playerIds = players.map((p) => p.id);
  const { data: existing, error: eErr } = await supabase
    .from('predictions')
    .select('player_id, match_id, predicted_home_score, predicted_away_score')
    .in('player_id', playerIds).in('match_id', matchIds);
  if (eErr) { console.error('Error leyendo predictions:', eErr.message); process.exit(1); }
  const existKey = new Map(
    existing.map((x) => [`${x.player_id}|${x.match_id}`, x]),
  );

  // ---- Reporte de RESULTADOS ----
  log('--- RESULTADOS REALES ---');
  const matchUpdates = [];
  for (const ext of externalIds) {
    const m = byExt.get(ext);
    const [h, a] = RESULTADOS[ext];
    const yaTiene = m.home_score != null && m.away_score != null;
    const igual = yaTiene && m.home_score === h && m.away_score === a;
    let nota = 'nuevo';
    if (igual && m.status === 'finished') nota = 'ya igual (omitir)';
    else if (yaTiene && !igual) nota = `CONFLICTO: BD tiene ${m.home_score}-${m.away_score}`;
    else if (m.status === 'finished') nota = 'finished sin marcador?';
    log(`  ${m.home_team} vs ${m.away_team}: ${h}-${a}  [${nota}]`);
    if (!(igual && m.status === 'finished')) {
      matchUpdates.push({ id: m.id, ext, h, a, conflicto: yaTiene && !igual });
    }
  }

  // ---- Reporte de PRONOSTICOS ----
  log('\n--- PRONOSTICOS ---');
  const toInsert = [];
  let nuevos = 0, igualesExist = 0, conflictos = 0;
  for (const [name, ext, ph, pa] of PRONOSTICOS) {
    const pl = byName.get(name);
    const m = byExt.get(ext);
    const k = `${pl.id}|${m.id}`;
    const prev = existKey.get(k);
    if (!prev) {
      nuevos++;
      toInsert.push({ player_id: pl.id, match_id: m.id, predicted_home_score: ph, predicted_away_score: pa });
    } else if (prev.predicted_home_score === ph && prev.predicted_away_score === pa) {
      igualesExist++;
    } else {
      conflictos++;
      log(`  CONFLICTO ${name} / ${m.home_team} vs ${m.away_team}: BD=${prev.predicted_home_score}-${prev.predicted_away_score} nuevo=${ph}-${pa}`);
      if (OVERWRITE) {
        toInsert.push({ player_id: pl.id, match_id: m.id, predicted_home_score: ph, predicted_away_score: pa });
      }
    }
  }
  log(`\n  Total filas: ${PRONOSTICOS.length} | nuevos: ${nuevos} | ya iguales: ${igualesExist} | conflictos: ${conflictos}`);
  log(`  Marcadores a actualizar: ${matchUpdates.length} (conflictos: ${matchUpdates.filter((x) => x.conflicto).length})`);

  if (!APPLY) {
    log('\n*** DRY RUN: no se escribio nada. Revisa el reporte y vuelve a correr con --apply ***\n');
    return;
  }

  // ---- APLICAR ----
  log('\n=== Aplicando pronosticos... ===');
  if (toInsert.length) {
    const { error } = await supabase
      .from('predictions')
      .upsert(toInsert, { onConflict: 'player_id,match_id' });
    if (error) { console.error('Error upsert predictions:', error.message); process.exit(1); }
    log(`  ${toInsert.length} pronosticos insertados/actualizados.`);
  } else {
    log('  Sin pronosticos para escribir.');
  }

  log('=== Aplicando marcadores... ===');
  for (const u of matchUpdates) {
    const { error } = await supabase
      .from('matches')
      .update({ home_score: u.h, away_score: u.a, status: 'finished' })
      .eq('id', u.id);
    if (error) { console.error(`Error update match ${u.ext}:`, error.message); process.exit(1); }
  }
  log(`  ${matchUpdates.length} marcadores actualizados (el trigger recalcula puntos).`);
  log('\n=== LISTO ===\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
