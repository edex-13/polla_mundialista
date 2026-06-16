function normalizeScoreValue(value) {
  if (value === '') return '';

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) return '';

  return String(parsedValue);
}

function formatMatchTime(matchTime) {
  return matchTime ? matchTime.slice(0, 5) : 'Hora por definir';
}

export default function MatchPredictionCard({
  match,
  prediction,
  isEditable,
  onPredictionChange,
}) {
  function handleScoreChange(fieldName, value) {
    if (!isEditable) return;

    onPredictionChange(match.id, fieldName, normalizeScoreValue(value));
  }

  return (
    <article className={`match-card ${isEditable ? '' : 'match-card-readonly'}`}>
      <div className="match-card-header">
        <div>
          <h3>
            {match.home_team} vs {match.away_team}
          </h3>
          <span className={`status-badge ${isEditable ? 'status-open' : 'status-closed'}`}>
            {isEditable ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        <span className="match-time">{formatMatchTime(match.match_time)}</span>
      </div>

      <div className="score-row">
        <label>
          <span>{match.home_team}</span>
          <input
            type="number"
            min="0"
            step="1"
            disabled={!isEditable}
            value={prediction.predicted_home_score}
            onChange={(event) =>
              handleScoreChange('predicted_home_score', event.target.value)
            }
          />
        </label>

        <strong>-</strong>

        <label>
          <input
            type="number"
            min="0"
            step="1"
            disabled={!isEditable}
            value={prediction.predicted_away_score}
            onChange={(event) =>
              handleScoreChange('predicted_away_score', event.target.value)
            }
          />
          <span>{match.away_team}</span>
        </label>
      </div>
    </article>
  );
}
