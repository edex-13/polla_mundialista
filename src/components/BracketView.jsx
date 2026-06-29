import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import TeamFlag from './TeamFlag.jsx';
import {
  ALL_EXT_IDS,
  BRACKET_COLUMNS,
  PLACEHOLDER,
  SLOT_BY_EXT,
  consumersOf,
  stageLabelFor,
} from '../lib/bracket.js';

const MATCH_COLUMNS =
  'id, external_id, match_date, match_time, home_team, away_team, home_score, away_score, status';

function isReal(team) {
  return team && team !== PLACEHOLDER;
}

// Ganador a mostrar: el marcado por el admin o, si el partido terminó con
// marcador distinto, el de mayor marcador.
function resolveWinner(match) {
  if (!match) return null;
  if (match.winner_team) return match.winner_team;
  if (
    match.status === 'finished' &&
    match.home_score != null &&
    match.away_score != null &&
    match.home_score !== match.away_score
  ) {
    return match.home_score > match.away_score ? match.home_team : match.away_team;
  }
  return null;
}

function formatWhen(match, ext) {
  const slot = SLOT_BY_EXT[ext];
  const date = match?.match_date ?? slot?.date;
  const time = match?.match_time ?? slot?.time;
  if (!date) return '';
  const d = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(
    new Date(`${date}T00:00:00`),
  );
  return time ? `${d} · ${time.slice(0, 5)}` : d;
}

export default function BracketView({ isAdmin = false, onChanged }) {
  const [matchesByExt, setMatchesByExt] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasWinnerColumn, setHasWinnerColumn] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [savingExt, setSavingExt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    // Intenta con winner_team; si la columna aún no existe, reintenta sin ella.
    let data = null;
    let withWinner = true;
    let res = await supabase
      .from('matches')
      .select(`${MATCH_COLUMNS}, winner_team`)
      .in('external_id', ALL_EXT_IDS);

    if (res.error) {
      withWinner = false;
      res = await supabase.from('matches').select(MATCH_COLUMNS).in('external_id', ALL_EXT_IDS);
    }

    if (res.error) {
      setErrorMessage('No se pudo cargar el cuadro');
      setIsLoading(false);
      return;
    }

    data = res.data ?? [];
    setHasWinnerColumn(withWinner);
    setMatchesByExt(Object.fromEntries(data.map((m) => [m.external_id, m])));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  async function advance(ext, winnerTeam) {
    const source = matchesByExt[ext];
    if (!source) return;
    const loserTeam =
      winnerTeam === source.home_team ? source.away_team : source.home_team;

    setSavingExt(ext);
    setErrorMessage('');

    // 1) Marca el ganador en el partido de origen.
    const { error: upErr } = await supabase
      .from('matches')
      .update({ winner_team: winnerTeam, status: 'finished' })
      .eq('id', source.id);

    if (upErr) {
      setSavingExt(null);
      setErrorMessage(
        'No se pudo guardar. ¿Ya aplicaste la migración winner_team en la BD?',
      );
      return;
    }

    // 2) Propaga a las llaves siguientes (ganador y, en semis, perdedor).
    for (const consumer of consumersOf(ext)) {
      const team = consumer.take === 'W' ? winnerTeam : loserTeam;
      const slot = consumer.slot;
      const existing = matchesByExt[consumer.ext];

      const row = {
        external_id: consumer.ext,
        tournament: 'Mundial 2026',
        stage: stageLabelFor(slot.round),
        group_name: null,
        match_date: existing?.match_date ?? slot.date,
        match_time: existing?.match_time ?? slot.time,
        home_team:
          consumer.side === 'home' ? team : existing?.home_team ?? PLACEHOLDER,
        away_team:
          consumer.side === 'away' ? team : existing?.away_team ?? PLACEHOLDER,
        status: existing?.status ?? 'scheduled',
      };

      const { error: nextErr } = await supabase
        .from('matches')
        .upsert(row, { onConflict: 'external_id' });

      if (nextErr) {
        setSavingExt(null);
        setErrorMessage('Se guardó el ganador pero falló al armar el siguiente cruce.');
        setReloadKey((k) => k + 1);
        return;
      }
    }

    setSavingExt(null);
    setReloadKey((k) => k + 1);
    onChanged?.();
  }

  function renderMatchCard(ext) {
    const match = matchesByExt[ext];
    const slot = SLOT_BY_EXT[ext];
    const home = match?.home_team ?? PLACEHOLDER;
    const away = match?.away_team ?? PLACEHOLDER;
    const winner = resolveWinner(match);
    const finished = match?.status === 'finished';
    const bothReal = isReal(home) && isReal(away);
    const showScore =
      finished && match?.home_score != null && match?.away_score != null;

    return (
      <article className={`bk-match ${finished ? 'bk-match-done' : ''}`} key={ext}>
        <span className="bk-match-when">{formatWhen(match, ext)}</span>

        {[
          { team: home, score: match?.home_score },
          { team: away, score: match?.away_score },
        ].map((row, idx) => {
          const isWinner = winner && row.team === winner;
          const placeholder = !isReal(row.team);
          return (
            <div
              className={`bk-team ${isWinner ? 'bk-team-win' : ''} ${
                placeholder ? 'bk-team-tbd' : ''
              }`}
              key={idx}
            >
              {placeholder ? (
                <span className="bk-flag-dot" aria-hidden="true" />
              ) : (
                <TeamFlag teamName={row.team} size="sm" />
              )}
              <span className="bk-team-name">{row.team}</span>
              {showScore ? <span className="bk-team-score">{row.score}</span> : null}
            </div>
          );
        })}

        {isAdmin && bothReal ? (
          <div className="bk-admin">
            <span className="bk-admin-label">¿Quién pasa?</span>
            <div className="bk-admin-btns">
              {[home, away].map((team) => (
                <button
                  type="button"
                  key={team}
                  className={`bk-pass-btn ${winner === team ? 'bk-pass-btn-on' : ''}`}
                  disabled={savingExt === ext}
                  onClick={() => advance(ext, team)}
                >
                  {team}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  if (isLoading) return <p className="empty-state">Cargando cuadro...</p>;

  return (
    <div className="bracket-wrap">
      {errorMessage ? <p className="message message-error">{errorMessage}</p> : null}
      {isAdmin && !hasWinnerColumn ? (
        <p className="message message-error">
          Falta aplicar la migración <code>winner_team</code> en la base para poder
          marcar quién avanza.
        </p>
      ) : null}

      <div className="bracket-scroll">
        <div className="bracket-grid">
          {BRACKET_COLUMNS.map((col) => (
            <div className="bk-col" key={col.key}>
              <h4 className="bk-col-title">{col.label}</h4>
              <div className="bk-col-matches">
                {col.exts.map((ext) => renderMatchCard(ext))}
              </div>

              {col.extra ? (
                <div className="bk-extra">
                  <h4 className="bk-col-title bk-col-title-bronze">{col.extra.label}</h4>
                  <div className="bk-col-matches">
                    {col.extra.exts.map((ext) => renderMatchCard(ext))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
