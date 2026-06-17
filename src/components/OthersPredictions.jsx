import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// Fecha y hora en que se registró el pronóstico (transparencia).
function formatRegisteredAt(isoValue) {
  if (!isoValue) return null;

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Lista los pronósticos del resto de participantes para un partido.
// Solo se monta cuando el partido ya inició (el panel padre lo controla),
// así nadie puede copiar marcadores antes de tiempo.
export default function OthersPredictions({ matchId, currentPlayerId }) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadOthers() {
      setIsLoading(true);
      setErrorMessage('');

      const { data, error } = await supabase
        .from('predictions')
        .select(
          'id, player_id, predicted_home_score, predicted_away_score, updated_at, created_at, players(name)',
        )
        .eq('match_id', matchId);

      if (shouldIgnoreResponse) return;

      if (error) {
        setRows([]);
        setErrorMessage('No se pudieron cargar los pronósticos');
        setIsLoading(false);
        return;
      }

      const normalized = data
        .filter((row) => row.players?.name?.toLowerCase() !== 'admin')
        .map((row) => ({
          id: row.id,
          playerId: row.player_id,
          name: row.players?.name ?? 'Participante',
          home: row.predicted_home_score,
          away: row.predicted_away_score,
          registeredAt: row.updated_at ?? row.created_at ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

      setRows(normalized);
      setIsLoading(false);
    }

    loadOthers();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [matchId]);

  if (isLoading) {
    return <p className="others-empty">Cargando pronósticos…</p>;
  }

  if (errorMessage) {
    return <p className="others-empty others-empty-error">{errorMessage}</p>;
  }

  if (rows.length === 0) {
    return <p className="others-empty">Nadie pronosticó este partido.</p>;
  }

  return (
    <ul className="others-list">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`others-item ${
            row.playerId === currentPlayerId ? 'others-item-me' : ''
          }`}
        >
          <span className="others-info">
            <span className="others-name">
              {row.name}
              {row.playerId === currentPlayerId ? <em> (tú)</em> : null}
            </span>
            {formatRegisteredAt(row.registeredAt) ? (
              <span className="others-time">
                Registrado: {formatRegisteredAt(row.registeredAt)}
              </span>
            ) : null}
          </span>
          <span className="others-score">
            {row.home} <span className="others-dash">-</span> {row.away}
          </span>
        </li>
      ))}
    </ul>
  );
}
