import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Ranking({ player, refreshKey }) {
  const [rankingRows, setRankingRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadRanking() {
      setIsLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('ranking_view')
        .select('player_id, name, total_points, total_predictions')
        .order('total_points', { ascending: false })
        .order('name', { ascending: true });

      if (shouldIgnoreResponse) return;

      if (error) {
        setRankingRows([]);
        setErrorMessage('Ocurrió un error cargando el ranking');
        setIsLoading(false);
        return;
      }

      setRankingRows(data);
      setIsLoading(false);
    }

    loadRanking();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [refreshKey]);

  if (isLoading) return <p className="empty-state">Cargando ranking...</p>;

  if (errorMessage) return <p className="message message-error">{errorMessage}</p>;

  return (
    <section className="ranking-section">
      <div className="ranking-table">
        <div className="ranking-row ranking-head">
          <span>Posición</span>
          <span>Participante</span>
          <span>Puntos</span>
          <span>Pronósticos</span>
        </div>

        {rankingRows.map((rankingRow, rankingIndex) => (
          <div
            className={`ranking-row ${
              rankingRow.player_id === player.id ? 'ranking-row-current' : ''
            }`}
            key={rankingRow.player_id}
          >
            <strong>#{rankingIndex + 1}</strong>
            <span>{rankingRow.name}</span>
            <span>{rankingRow.total_points} pts</span>
            <span>{rankingRow.total_predictions}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
