import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import PlayerHistory from './PlayerHistory.jsx';

// Inicial(es) del participante para el avatar.
function getInitials(name) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Asigna posición con manejo de empates: mismo puntaje => misma posición.
function withRankPositions(rows) {
  let lastPoints = null;
  let lastPosition = 0;

  return rows.map((row, index) => {
    const position =
      row.total_points === lastPoints ? lastPosition : index + 1;

    lastPoints = row.total_points;
    lastPosition = position;

    return { ...row, position };
  });
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatPredictionCount(totalPredictions) {
  const count = totalPredictions ?? 0;

  return `${count} pronóstico${count === 1 ? '' : 's'}`;
}

export default function Ranking({ player, refreshKey }) {
  const [rankingRows, setRankingRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

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

      // El usuario administrador no compite: se excluye del ranking.
      setRankingRows((data ?? []).filter((row) => row.name?.toLowerCase() !== 'admin'));
      setIsLoading(false);
    }

    loadRanking();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [refreshKey]);

  if (isLoading) return <p className="empty-state">Cargando ranking...</p>;

  if (errorMessage) return <p className="message message-error">{errorMessage}</p>;

  if (rankingRows.length === 0) {
    return <p className="empty-state">Todavía no hay participantes en el ranking</p>;
  }

  const rankedRows = withRankPositions(rankingRows);

  // El podio toma las 3 primeras filas por orden de lista (índice), no por
  // número de posición: así siempre se muestran 3 escalones aunque haya
  // empates (ej. todos con 0 puntos al inicio). El número con empates queda
  // como etiqueta. `spot` es el lugar físico 1/2/3 (medalla y altura de base).
  const podium = rankedRows.slice(0, 3).map((row, index) => ({
    ...row,
    spot: index + 1,
  }));
  const restRows = rankedRows.slice(3);

  // Orden visual del podio: 2º, 1º, 3º (el campeón al centro y elevado).
  const podiumOrder = [
    podium.find((row) => row.spot === 2),
    podium.find((row) => row.spot === 1),
    podium.find((row) => row.spot === 3),
  ].filter(Boolean);

  return (
    <section className="ranking-section">
      <p className="ranking-hint">Toca a un participante para ver cómo sumó sus puntos.</p>

      {podiumOrder.length > 0 ? (
        <div className="podium">
          {podiumOrder.map((row) => (
            <button
              type="button"
              className={`podium-spot podium-spot-${row.spot} ${
                row.player_id === player.id ? 'podium-spot-me' : ''
              }`}
              key={row.player_id}
              onClick={() => setSelectedRow(row)}
            >
              <span className="podium-medal">{MEDALS[row.spot]}</span>
              <span className="podium-avatar">{getInitials(row.name)}</span>
              <span className="podium-name">{row.name}</span>
              <span className="podium-points">{row.total_points}</span>
              <span className="podium-points-label">pts</span>
              <span className="podium-predictions">
                {formatPredictionCount(row.total_predictions)}
              </span>
              <span className="podium-base">{row.position}</span>
            </button>
          ))}
        </div>
      ) : null}

      {restRows.length > 0 ? (
        <div className="ranking-table">
          {restRows.map((row) => (
            <button
              type="button"
              className={`ranking-row ${
                row.player_id === player.id ? 'ranking-row-me' : ''
              }`}
              key={row.player_id}
              onClick={() => setSelectedRow(row)}
            >
              <span className="ranking-pos">{row.position}</span>
              <span className="ranking-avatar">{getInitials(row.name)}</span>
              <span className="ranking-name">
                {row.name}
                {row.player_id === player.id ? <em> (tú)</em> : null}
                <small>{formatPredictionCount(row.total_predictions)}</small>
              </span>
              <span className="ranking-pts">
                <strong>{row.total_points}</strong>
                <small>pts</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedRow ? (
        <PlayerHistory player={selectedRow} onClose={() => setSelectedRow(null)} />
      ) : null}
    </section>
  );
}
