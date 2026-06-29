// =========================================================
// Estructura del cuadro de eliminatorias - Mundial 2026
// =========================================================
// Cada partido se identifica por su external_id en la tabla `matches`.
// Los dieciseisavos (R32) ya existen en la BD; las rondas siguientes se
// crean/llenan automáticamente cuando el admin marca quién avanza.
//
// Fuente de cruces: cuadro oficial FIFA/Wikipedia (Mundial 2026).
// Horas en zona Colombia (UTC-5).
// =========================================================

export const PLACEHOLDER = 'Por definir';

// Identificadores de ronda en orden de avance.
export const ROUNDS = [
  { key: 'r32', label: 'Dieciseisavos', short: '16avos' },
  { key: 'r16', label: 'Octavos', short: '8vos' },
  { key: 'qf', label: 'Cuartos', short: '4tos' },
  { key: 'sf', label: 'Semifinal', short: 'Semis' },
  { key: 'final', label: 'Final', short: 'Final' },
];

// Dieciseisavos: equipos fijos (vienen de la fase de grupos). Solo definimos
// el external_id; los nombres de equipo se leen de la BD.
const R32 = [
  'wc2026-r32-73', 'wc2026-r32-74', 'wc2026-r32-75', 'wc2026-r32-76',
  'wc2026-r32-77', 'wc2026-r32-78', 'wc2026-r32-79', 'wc2026-r32-80',
  'wc2026-r32-81', 'wc2026-r32-82', 'wc2026-r32-83', 'wc2026-r32-84',
  'wc2026-r32-85', 'wc2026-r32-86', 'wc2026-r32-87', 'wc2026-r32-88',
].map((ext) => ({ ext, round: 'r32' }));

// Rondas siguientes: cada lado se alimenta del ganador (W) o perdedor (L)
// de un partido anterior. take: 'W' = ganador, 'L' = perdedor.
const NEXT = [
  // --- Octavos (R16) ---
  { ext: 'wc2026-r16-89', round: 'r16', date: '2026-07-04', time: '16:00', home: { from: 'wc2026-r32-74', take: 'W' }, away: { from: 'wc2026-r32-77', take: 'W' } },
  { ext: 'wc2026-r16-90', round: 'r16', date: '2026-07-04', time: '12:00', home: { from: 'wc2026-r32-73', take: 'W' }, away: { from: 'wc2026-r32-75', take: 'W' } },
  { ext: 'wc2026-r16-91', round: 'r16', date: '2026-07-05', time: '15:00', home: { from: 'wc2026-r32-76', take: 'W' }, away: { from: 'wc2026-r32-78', take: 'W' } },
  { ext: 'wc2026-r16-92', round: 'r16', date: '2026-07-05', time: '19:00', home: { from: 'wc2026-r32-79', take: 'W' }, away: { from: 'wc2026-r32-80', take: 'W' } },
  { ext: 'wc2026-r16-93', round: 'r16', date: '2026-07-06', time: '14:00', home: { from: 'wc2026-r32-83', take: 'W' }, away: { from: 'wc2026-r32-84', take: 'W' } },
  { ext: 'wc2026-r16-94', round: 'r16', date: '2026-07-06', time: '19:00', home: { from: 'wc2026-r32-81', take: 'W' }, away: { from: 'wc2026-r32-82', take: 'W' } },
  { ext: 'wc2026-r16-95', round: 'r16', date: '2026-07-07', time: '11:00', home: { from: 'wc2026-r32-86', take: 'W' }, away: { from: 'wc2026-r32-88', take: 'W' } },
  { ext: 'wc2026-r16-96', round: 'r16', date: '2026-07-07', time: '15:00', home: { from: 'wc2026-r32-85', take: 'W' }, away: { from: 'wc2026-r32-87', take: 'W' } },
  // --- Cuartos (QF) ---
  { ext: 'wc2026-qf-97', round: 'qf', date: '2026-07-09', time: '15:00', home: { from: 'wc2026-r16-89', take: 'W' }, away: { from: 'wc2026-r16-90', take: 'W' } },
  { ext: 'wc2026-qf-98', round: 'qf', date: '2026-07-10', time: '14:00', home: { from: 'wc2026-r16-93', take: 'W' }, away: { from: 'wc2026-r16-94', take: 'W' } },
  { ext: 'wc2026-qf-99', round: 'qf', date: '2026-07-11', time: '16:00', home: { from: 'wc2026-r16-91', take: 'W' }, away: { from: 'wc2026-r16-92', take: 'W' } },
  { ext: 'wc2026-qf-100', round: 'qf', date: '2026-07-11', time: '20:00', home: { from: 'wc2026-r16-95', take: 'W' }, away: { from: 'wc2026-r16-96', take: 'W' } },
  // --- Semifinales (SF) ---
  { ext: 'wc2026-sf-101', round: 'sf', date: '2026-07-14', time: '14:00', home: { from: 'wc2026-qf-97', take: 'W' }, away: { from: 'wc2026-qf-98', take: 'W' } },
  { ext: 'wc2026-sf-102', round: 'sf', date: '2026-07-15', time: '14:00', home: { from: 'wc2026-qf-99', take: 'W' }, away: { from: 'wc2026-qf-100', take: 'W' } },
  // --- Tercer puesto ---
  { ext: 'wc2026-tp-103', round: 'tp', date: '2026-07-18', time: '14:00', home: { from: 'wc2026-sf-101', take: 'L' }, away: { from: 'wc2026-sf-102', take: 'L' } },
  // --- Final ---
  { ext: 'wc2026-f-104', round: 'final', date: '2026-07-19', time: '14:00', home: { from: 'wc2026-sf-101', take: 'W' }, away: { from: 'wc2026-sf-102', take: 'W' } },
];

export const ALL_SLOTS = [...R32, ...NEXT];
export const ALL_EXT_IDS = ALL_SLOTS.map((s) => s.ext);

// Metadatos por external_id (round/date/time/feeders) para crear filas.
export const SLOT_BY_EXT = Object.fromEntries(ALL_SLOTS.map((s) => [s.ext, s]));

const STAGE_LABEL = {
  r32: 'Dieciseisavos de final',
  r16: 'Octavos de final',
  qf: 'Cuartos de final',
  sf: 'Semifinal',
  tp: 'Tercer puesto',
  final: 'Final',
};

export function stageLabelFor(roundKey) {
  return STAGE_LABEL[roundKey] ?? 'Eliminatorias';
}

// Devuelve los slots que CONSUMEN el resultado de un partido (ext dado).
// Cada uno indica el slot destino, el lado (home/away) y si toma W o L.
export function consumersOf(ext) {
  const out = [];
  for (const slot of NEXT) {
    if (slot.home.from === ext) out.push({ ext: slot.ext, side: 'home', take: slot.home.take, slot });
    if (slot.away.from === ext) out.push({ ext: slot.ext, side: 'away', take: slot.away.take, slot });
  }
  return out;
}

// Estructura para pintar el cuadro: columnas por ronda (incluye 3er puesto
// como una columna especial junto a la final).
export const BRACKET_COLUMNS = [
  { key: 'r32', label: 'Dieciseisavos', exts: R32.map((s) => s.ext) },
  { key: 'r16', label: 'Octavos', exts: ['wc2026-r16-89', 'wc2026-r16-90', 'wc2026-r16-91', 'wc2026-r16-92', 'wc2026-r16-93', 'wc2026-r16-94', 'wc2026-r16-95', 'wc2026-r16-96'] },
  { key: 'qf', label: 'Cuartos', exts: ['wc2026-qf-97', 'wc2026-qf-98', 'wc2026-qf-99', 'wc2026-qf-100'] },
  { key: 'sf', label: 'Semifinal', exts: ['wc2026-sf-101', 'wc2026-sf-102'] },
  { key: 'final', label: 'Final', exts: ['wc2026-f-104'], extra: { label: 'Tercer puesto', exts: ['wc2026-tp-103'] } },
];
