import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import TeamFlag from './TeamFlag.jsx';

function formatScore(homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return 'Pendiente';

  return `${homeScore} - ${awayScore}`;
}

function formatMatchDate(matchDate) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${matchDate}T00:00:00`));
}

// Etiqueta que explica por qué se obtuvo ese puntaje en un partido finalizado.
function getPointsTag(points) {
  if (points >= 3) {
    return { label: 'Marcador exacto · +3', className: 'points-tag-exact' };
  }

  if (points >= 1) {
    return { label: 'Acertaste el ganador · +1', className: 'points-tag-trend' };
  }

  return { label: 'Sin acierto · 0', className: 'points-tag-miss' };
}

export default function MyPredictionResults({ player, refreshKey, hideTitle = false }) {
  const [predictionDetails, setPredictionDetails] = useState([]);
  const [groupPredictions, setGroupPredictions] = useState([]);
  const [realGroupsByName, setRealGroupsByName] = useState({});
  const [podiumPrediction, setPodiumPrediction] = useState(null);
  const [realPodium, setRealPodium] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadPredictionDetails() {
      setIsLoading(true);
      setErrorMessage('');

      const [
        matchesResult,
        groupsResult,
        realGroupsResult,
        podiumResult,
        realPodiumResult,
      ] = await Promise.all([
        supabase
          .from('prediction_details_view')
          .select(
            'prediction_id, match_date, match_time, home_team, away_team, predicted_home_score, predicted_away_score, home_score, away_score, status, points',
          )
          .eq('player_id', player.id)
          .order('match_date', { ascending: false })
          .order('match_time', { ascending: true }),
        supabase
          .from('group_predictions')
          .select('group_name, first_place, second_place, points')
          .eq('player_id', player.id)
          .order('group_name', { ascending: true }),
        supabase
          .from('group_results')
          .select('group_name, first_place, second_place'),
        supabase
          .from('tournament_predictions')
          .select('champion, runner_up, third_place, points')
          .eq('player_id', player.id)
          .maybeSingle(),
        supabase
          .from('tournament_result')
          .select('champion, runner_up, third_place')
          .eq('id', 1)
          .maybeSingle(),
      ]);

      if (shouldIgnoreResponse) return;

      if (matchesResult.error) {
        setPredictionDetails([]);
        setErrorMessage('Ocurrió un error cargando tus resultados');
        setIsLoading(false);
        return;
      }

      setPredictionDetails(matchesResult.data ?? []);
      setGroupPredictions(groupsResult.data ?? []);
      setRealGroupsByName(
        Object.fromEntries(
          (realGroupsResult.data ?? []).map((groupResult) => [
            groupResult.group_name,
            groupResult,
          ]),
        ),
      );
      setPodiumPrediction(podiumResult.data ?? null);
      setRealPodium(realPodiumResult.data ?? null);
      setIsLoading(false);
    }

    loadPredictionDetails();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [player.id, refreshKey]);

  if (isLoading) return <p className="empty-state">Cargando tus resultados...</p>;

  if (errorMessage) return <p className="message message-error">{errorMessage}</p>;

  if (
    predictionDetails.length === 0 &&
    groupPredictions.length === 0 &&
    !podiumPrediction
  ) {
    return <p className="empty-state">Todavía no tienes pronósticos guardados</p>;
  }

  return (
    <section className="results-section">
      {hideTitle ? null : <h3>Mis resultados</h3>}

      <div className="points-legend">
        <p className="points-legend-title">¿Cómo se ganan los puntos?</p>
        <ul>
          <li>
            <span className="points-chip points-chip-exact">+0.5</span>
            <span>
              <strong>Grupos.</strong> Aciertas primero o segundo exacto de un grupo.
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-exact">+10</span>
            <span>
              <strong>Podio campeón.</strong> Aciertas campeón exacto del Mundial.
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-trend">+8</span>
            <span>
              <strong>Podio segundo.</strong> Aciertas subcampeón exacto.
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-trend">+5</span>
            <span>
              <strong>Podio tercero.</strong> Aciertas tercer lugar exacto.
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-miss">+1</span>
            <span>
              <strong>Equipo en podio.</strong> Tu equipo queda en el podio, pero en otra posición.
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-exact">+3</span>
            <span>
              <strong>Marcador exacto.</strong> Aciertas el resultado completo (ej.
              pronosticas 2-1 y queda 2-1).
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-trend">+1</span>
            <span>
              <strong>Aciertas el ganador.</strong> Aciertas quién gana o si es empate,
              pero no el marcador exacto (ej. pronosticas 3-0 y queda 1-0).
            </span>
          </li>
          <li>
            <span className="points-chip points-chip-miss">0</span>
            <span>
              <strong>Sin acierto.</strong> No aciertas ni el ganador ni el marcador.
            </span>
          </li>
        </ul>
      </div>

      {podiumPrediction ? (
        <section className="history-block">
          <h3>Mi podio</h3>
          <ul className="history-podium">
            {[
              {
                medal: '🥇',
                label: 'Campeón',
                team: podiumPrediction.champion,
                realTeam: realPodium?.champion,
              },
              {
                medal: '🥈',
                label: 'Subcampeón',
                team: podiumPrediction.runner_up,
                realTeam: realPodium?.runner_up,
              },
              {
                medal: '🥉',
                label: 'Tercero',
                team: podiumPrediction.third_place,
                realTeam: realPodium?.third_place,
              },
            ].map((slot) => {
              const realTeams = [
                realPodium?.champion,
                realPodium?.runner_up,
                realPodium?.third_place,
              ]
                .filter(Boolean)
                .map((team) => team.toLowerCase());
              const selectedTeam = slot.team?.toLowerCase() ?? '';
              const isExact = slot.realTeam?.toLowerCase() === selectedTeam;
              const isInPodium = realTeams.includes(selectedTeam);

              return (
                <li key={slot.label}>
                  <span className="history-podium-medal">{slot.medal}</span>
                  <TeamFlag teamName={slot.team} size="sm" />
                  <span className="history-podium-team">{slot.team}</span>
                  {isExact ? (
                    <span className="history-podium-hit history-podium-hit-exact">
                      Exacto
                    </span>
                  ) : isInPodium ? (
                    <span className="history-podium-hit">En podio +1</span>
                  ) : (
                    <span className="history-podium-label">{slot.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="points-tag points-tag-exact">
            Podio Mundial · {podiumPrediction.points ?? 0} pts
          </p>
        </section>
      ) : null}

      {groupPredictions.length > 0 ? (
        <section className="history-block">
          <h3>Mis grupos</h3>
          <ul className="history-podium">
            {groupPredictions.map((groupPrediction) => {
              const realGroup = realGroupsByName[groupPrediction.group_name];

              return (
                <li key={groupPrediction.group_name}>
                  <span className="history-group-name">{groupPrediction.group_name}</span>
                  <span className="history-group-teams">
                    {groupPrediction.first_place} / {groupPrediction.second_place}
                  </span>
                  <span
                    className={`history-podium-hit ${
                      groupPrediction.points > 0 ? 'history-podium-hit-exact' : ''
                    }`}
                  >
                    {realGroup ? `${groupPrediction.points ?? 0} pts` : 'Pendiente'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {predictionDetails.length > 0 ? (
        <div className="history-list">
        {predictionDetails.map((predictionDetail) => (
          <article className="history-card" key={predictionDetail.prediction_id}>
            <div>
              <p className="eyebrow">{formatMatchDate(predictionDetail.match_date)}</p>
              <div className="history-teams">
                <TeamFlag teamName={predictionDetail.home_team} size="sm" />
                <h3>
                  {predictionDetail.home_team} vs {predictionDetail.away_team}
                </h3>
                <TeamFlag teamName={predictionDetail.away_team} size="sm" />
              </div>
            </div>

            <div className="history-grid">
              <div>
                <span>Tu pronóstico</span>
                <strong>
                  {predictionDetail.predicted_home_score} -{' '}
                  {predictionDetail.predicted_away_score}
                </strong>
              </div>

              <div>
                <span>Resultado real</span>
                <strong>
                  {predictionDetail.status === 'finished'
                    ? formatScore(predictionDetail.home_score, predictionDetail.away_score)
                    : 'Pendiente'}
                </strong>
              </div>

              <div>
                <span>Puntos</span>
                <strong>{predictionDetail.points ?? 0}</strong>
              </div>
            </div>

            {predictionDetail.status === 'finished' ? (
              (() => {
                const tag = getPointsTag(predictionDetail.points ?? 0);
                return <p className={`points-tag ${tag.className}`}>{tag.label}</p>;
              })()
            ) : (
              <p className="points-tag points-tag-pending">Aún sin resultado</p>
            )}
          </article>
        ))}
        </div>
      ) : null}
    </section>
  );
}
