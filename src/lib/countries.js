// Mapeo de nombre de selección (tal como viene en la BD de producción)
// a su código ISO 3166-1 alpha-2, usado para construir la URL de la bandera.
// No se toca la base de datos: el match se hace por nombre normalizado.
const COUNTRY_CODE_BY_NAME = {
  alemania: 'de',
  'arabia saudita': 'sa',
  argelia: 'dz',
  argentina: 'ar',
  australia: 'au',
  austria: 'at',
  'bosnia y herzegovina': 'ba',
  brasil: 'br',
  belgica: 'be',
  'cabo verde': 'cv',
  canada: 'ca',
  catar: 'qa',
  chequia: 'cz',
  chile: 'cl',
  colombia: 'co',
  'corea del sur': 'kr',
  'costa de marfil': 'ci',
  croacia: 'hr',
  curazao: 'cw',
  ecuador: 'ec',
  egipto: 'eg',
  escocia: 'gb-sct',
  espana: 'es',
  'estados unidos': 'us',
  francia: 'fr',
  ghana: 'gh',
  haiti: 'ht',
  inglaterra: 'gb-eng',
  irak: 'iq',
  iran: 'ir',
  japon: 'jp',
  jordania: 'jo',
  marruecos: 'ma',
  mexico: 'mx',
  noruega: 'no',
  'nueva zelanda': 'nz',
  panama: 'pa',
  paraguay: 'py',
  'paises bajos': 'nl',
  peru: 'pe',
  portugal: 'pt',
  'rd congo': 'cd',
  senegal: 'sn',
  sudafrica: 'za',
  suecia: 'se',
  suiza: 'ch',
  turquia: 'tr',
  tunez: 'tn',
  uruguay: 'uy',
  uzbekistan: 'uz',
};

// Nombres "bonitos" de las selecciones, para sugerir en el formulario de
// nuevos partidos (asegura que el equipo tenga bandera). Acepta texto libre
// igual, por si se agregan fases con nombres distintos.
export const TEAM_NAMES = [
  'Alemania', 'Arabia Saudita', 'Argelia', 'Argentina', 'Australia', 'Austria',
  'Bélgica', 'Bosnia y Herzegovina', 'Brasil', 'Cabo Verde', 'Canadá', 'Catar',
  'Chequia', 'Chile', 'Colombia', 'Corea del Sur', 'Costa de Marfil', 'Croacia',
  'Curazao', 'Ecuador', 'Egipto', 'Escocia', 'España', 'Estados Unidos',
  'Francia', 'Ghana', 'Haití', 'Inglaterra', 'Irak', 'Irán', 'Japón', 'Jordania',
  'Marruecos', 'México', 'Noruega', 'Nueva Zelanda', 'Panamá', 'Paraguay',
  'Países Bajos', 'Perú', 'Portugal', 'RD Congo', 'Senegal', 'Sudáfrica',
  'Suecia', 'Suiza', 'Turquía', 'Túnez', 'Uruguay', 'Uzbekistán',
];

// Quita acentos y normaliza para hacer match robusto contra el nombre guardado.
function normalizeCountryName(name) {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function getCountryCode(teamName) {
  return COUNTRY_CODE_BY_NAME[normalizeCountryName(teamName)] ?? null;
}

// flagcdn entrega imágenes reales (no emojis), nítidas en todos los dispositivos.
export function getFlagUrl(teamName, width = 80) {
  const code = getCountryCode(teamName);

  if (!code) return null;

  return `https://flagcdn.com/w${width}/${code}.png`;
}

// Iniciales para el fallback cuando no hay bandera (caso raro / equipo no mapeado).
export function getTeamInitials(teamName) {
  const cleaned = (teamName ?? '').trim();

  if (!cleaned) return '?';

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
