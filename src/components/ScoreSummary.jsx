import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function ScoreSummary({ player, refreshKey }) {
  const [rankingRows, setRankingRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadRankingSummary() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('ranking_view')
        .select('player_id, name, total_points, total_predictions')
        .order('total_points', { ascending: false })
        .order('name', { ascending: true });

      if (shouldIgnoreResponse) return;

      // Excluye al administrador para que la posición sea consistente con el ranking.
      const rows = error ? [] : (data ?? []).filter(
        (row) => row.name?.toLowerCase() !== 'admin',
      );
      setRankingRows(rows);
      setIsLoading(false);
    }

    loadRankingSummary();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [refreshKey]);

  const playerRankingIndex = rankingRows.findIndex(
    (rankingRow) => rankingRow.player_id === player.id,
  );
  const playerRanking = rankingRows[playerRankingIndex];
  const playerPosition = playerRankingIndex >= 0 ? playerRankingIndex + 1 : '-';

  return (
    <section className="score-summary">
      <div>
        <p className="eyebrow">Tu puntaje actual</p>
        <strong>{isLoading ? '...' : `${playerRanking?.total_points ?? 0} puntos`}</strong>
      </div>

      <div>
        <p className="eyebrow">Tu posición</p>
        <strong>{isLoading ? '...' : `#${playerPosition}`}</strong>
      </div>

      <div>
        <p className="eyebrow">Pronósticos</p>
        <strong>{isLoading ? '...' : (playerRanking?.total_predictions ?? 0)}</strong>
      </div>
    </section>
  );
}
