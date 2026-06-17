import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import TeamFlag from './TeamFlag.jsx';

function getInitials(name) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatMatchDate(matchDate) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${matchDate}T00:00:00`));
}

// Cómo se ganaron los puntos de un partido finalizado.
function getMatchPointsTag(points) {
  if (points >= 3) return { label: 'Marcador exacto', className: 'tag-exact' };
  if (points >= 1) return { label: 'Acertó el ganador', className: 'tag-trend' };
  return { label: 'Sin acierto', className: 'tag-miss' };
}

export default function PlayerHistory({ player, onClose }) {
  const [matches, setMatches] = useState([]);
  const [podium, setPodium] = useState(null);
  const [realPodium, setRealPodium] = useState(null);
  const [groupPredictions, setGroupPredictions] = useState([]);
  const [realGroupsByName, setRealGroupsByName] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadHistory() {
      setIsLoading(true);
      setErrorMessage('');

      const [matchesResult, podiumResult, realPodiumResult, groupsResult, realGroupsResult] =
        await Promise.all([
        supabase
          .from('prediction_details_view')
          .select(
            'prediction_id, match_date, match_time, home_team, away_team, predicted_home_score, predicted_away_score, home_score, away_score, status, points',
          )
          .eq('player_id', player.player_id)
          .order('match_date', { ascending: false }),
        supabase
          .from('tournament_predictions')
          .select('champion, runner_up, third_place, points')
          .eq('player_id', player.player_id)
          .maybeSingle(),
        supabase
          .from('tournament_result')
          .select('champion, runner_up, third_place')
          .eq('id', 1)
          .maybeSingle(),
        supabase
          .from('group_predictions')
          .select('group_name, first_place, second_place, points')
          .eq('player_id', player.player_id)
          .order('group_name', { ascending: true }),
        supabase
          .from('group_results')
          .select('group_name, first_place, second_place'),
      ]);

      if (shouldIgnore) return;

      if (matchesResult.error) {
        setErrorMessage('No se pudo cargar el historial');
        setIsLoading(false);
        return;
      }

      setMatches(matchesResult.data ?? []);
      setPodium(podiumResult.data ?? null);
      setRealPodium(realPodiumResult.data ?? null);
      setGroupPredictions(groupsResult.data ?? []);
      setRealGroupsByName(
        Object.fromEntries(
          (realGroupsResult.data ?? []).map((groupResult) => [
            groupResult.group_name,
            groupResult,
          ]),
        ),
      );
      setIsLoading(false);
    }

    loadHistory();

    return () => {
      shouldIgnore = true;
    };
  }, [player.player_id]);

  const matchPoints = matches.reduce((total, item) => total + (item.points ?? 0), 0);
  const groupPoints = groupPredictions.reduce(
    (total, item) => total + (item.points ?? 0),
    0,
  );
  const podiumPoints = podium?.points ?? 0;
  const finishedCount = matches.filter((item) => item.status === 'finished').length;

  return (
    <div className="sheet-overlay" role="presentation" onClick={onClose}>
      <div
        className="sheet sheet-tall"
        role="dialog"
        aria-modal="true"
        aria-label={`Historial de ${player.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="history-sheet-head">
          <span className="history-sheet-avatar">{getInitials(player.name)}</span>
          <div>
            <h3>{player.name}</h3>
            <p className="history-sheet-sub">
              {player.total_points} puntos · {finishedCount} partido
              {finishedCount === 1 ? '' : 's'} jugado{finishedCount === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            className="sheet-close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="history-sheet-body">
          {isLoading ? (
            <p className="empty-state">Cargando historial...</p>
          ) : errorMessage ? (
            <p className="message message-error">{errorMessage}</p>
          ) : (
            <>
              <div className="history-totals">
                <div>
                  <span>Partidos</span>
                  <strong>{matchPoints} pts</strong>
                </div>
                <div>
                  <span>Grupos</span>
                  <strong>{groupPoints} pts</strong>
                </div>
                <div>
                  <span>Podio Mundial</span>
                  <strong>{podiumPoints} pts</strong>
                </div>
                <div className="history-totals-main">
                  <span>Total</span>
                  <strong>{player.total_points} pts</strong>
                </div>
              </div>

              {podium ? (
                <section className="history-block">
                  <h4>Pronóstico del podio</h4>
                  <ul className="history-podium">
                    {[
                      { medal: '🥇', label: 'Campeón', team: podium.champion, real: realPodium?.champion },
                      { medal: '🥈', label: 'Subcampeón', team: podium.runner_up, real: realPodium?.runner_up },
                      { medal: '🥉', label: 'Tercero', team: podium.third_place, real: realPodium?.third_place },
                    ].map((slot) => {
                      const realTeams = realPodium
                        ? [realPodium.champion, realPodium.runner_up, realPodium.third_place]
                            .filter(Boolean)
                            .map((team) => team.toLowerCase())
                        : [];
                      const slotTeam = (slot.team ?? '').toLowerCase();
                      const isExact = slot.real && slotTeam === slot.real.toLowerCase();
                      const inPodium = realTeams.includes(slotTeam);

                      return (
                        <li key={slot.label}>
                          <span className="history-podium-medal">{slot.medal}</span>
                          <TeamFlag teamName={slot.team} size="sm" />
                          <span className="history-podium-team">{slot.team}</span>
                          {isExact ? (
                            <span className="history-podium-hit history-podium-hit-exact">
                              Exacto
                            </span>
                          ) : inPodium ? (
                            <span className="history-podium-hit">En el podio +1</span>
                          ) : (
                            <span className="history-podium-label">{slot.label}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {groupPredictions.length > 0 ? (
                <section className="history-block">
                  <h4>Predicción por grupos</h4>
                  <ul className="history-podium">
                    {groupPredictions.map((groupPrediction) => {
                      const realGroup = realGroupsByName[groupPrediction.group_name];
                      const firstExact =
                        realGroup?.first_place &&
                        groupPrediction.first_place?.toLowerCase() ===
                          realGroup.first_place.toLowerCase();
                      const secondExact =
                        realGroup?.second_place &&
                        groupPrediction.second_place?.toLowerCase() ===
                          realGroup.second_place.toLowerCase();

                      return (
                        <li key={groupPrediction.group_name}>
                          <span className="history-group-name">
                            {groupPrediction.group_name}
                          </span>
                          <span className="history-group-teams">
                            {groupPrediction.first_place} / {groupPrediction.second_place}
                          </span>
                          <span
                            className={`history-podium-hit ${
                              groupPrediction.points > 0 ? 'history-podium-hit-exact' : ''
                            }`}
                          >
                            {firstExact || secondExact
                              ? `+${groupPrediction.points} pts`
                              : `${groupPrediction.points ?? 0} pts`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <section className="history-block">
                <h4>Partidos pronosticados</h4>

                {matches.length === 0 ? (
                  <p className="history-empty">Aún no tiene pronósticos de partidos.</p>
                ) : (
                  <ul className="history-matches">
                    {matches.map((item) => {
                      const isFinished = item.status === 'finished';
                      const tag = getMatchPointsTag(item.points ?? 0);

                      return (
                        <li className="history-match" key={item.prediction_id}>
                          <div className="history-match-top">
                            <span className="history-match-date">
                              {formatMatchDate(item.match_date)}
                            </span>
                            {isFinished ? (
                              <span className={`history-tag ${tag.className}`}>
                                {tag.label} · {item.points ?? 0} pts
                              </span>
                            ) : (
                              <span className="history-tag tag-pending">Pendiente</span>
                            )}
                          </div>

                          <div className="history-match-teams">
                            <span className="history-match-team">
                              <TeamFlag teamName={item.home_team} size="sm" />
                              {item.home_team}
                            </span>
                            <span className="history-match-vs">
                              {item.predicted_home_score}-{item.predicted_away_score}
                              {isFinished ? (
                                <em>
                                  {' '}
                                  (real {item.home_score}-{item.away_score})
                                </em>
                              ) : null}
                            </span>
                            <span className="history-match-team history-match-team-away">
                              {item.away_team}
                              <TeamFlag teamName={item.away_team} size="sm" />
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
