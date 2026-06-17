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
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadPredictionDetails() {
      setIsLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('prediction_details_view')
        .select(
          'prediction_id, match_date, match_time, home_team, away_team, predicted_home_score, predicted_away_score, home_score, away_score, status, points',
        )
        .eq('player_id', player.id)
        .order('match_date', { ascending: false })
        .order('match_time', { ascending: true });

      if (shouldIgnoreResponse) return;

      if (error) {
        setPredictionDetails([]);
        setErrorMessage('Ocurrió un error cargando tus resultados');
        setIsLoading(false);
        return;
      }

      setPredictionDetails(data);
      setIsLoading(false);
    }

    loadPredictionDetails();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [player.id, refreshKey]);

  if (isLoading) return <p className="empty-state">Cargando tus resultados...</p>;

  if (errorMessage) return <p className="message message-error">{errorMessage}</p>;

  if (predictionDetails.length === 0) {
    return <p className="empty-state">Todavía no tienes pronósticos guardados</p>;
  }

  return (
    <section className="results-section">
      {hideTitle ? null : <h3>Mis resultados</h3>}

      <div className="points-legend">
        <p className="points-legend-title">¿Cómo se ganan los puntos?</p>
        <ul>
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
    </section>
  );
}
