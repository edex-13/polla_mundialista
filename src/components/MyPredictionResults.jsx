import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

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

      <div className="history-list">
        {predictionDetails.map((predictionDetail) => (
          <article className="history-card" key={predictionDetail.prediction_id}>
            <div>
              <p className="eyebrow">{formatMatchDate(predictionDetail.match_date)}</p>
              <h3>
                {predictionDetail.home_team} vs {predictionDetail.away_team}
              </h3>
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
          </article>
        ))}
      </div>
    </section>
  );
}
