import { useState } from 'react';
import TeamFlag from './TeamFlag.jsx';
import OthersPredictions from './OthersPredictions.jsx';

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
  currentPlayerId,
  onPredictionChange,
}) {
  const [showOthers, setShowOthers] = useState(false);

  function handleScoreChange(fieldName, value) {
    if (!isEditable) return;

    onPredictionChange(match.id, fieldName, normalizeScoreValue(value));
  }

  return (
    <article className={`match-card ${isEditable ? '' : 'match-card-readonly'}`}>
      <div className="match-card-top">
        {match.group_name ? (
          <span className="match-group">{match.group_name}</span>
        ) : (
          <span className="match-group match-group-muted">Partido</span>
        )}
        <span className="match-time-pill">{formatMatchTime(match.match_time)}</span>
        <span className={`status-dot ${isEditable ? 'status-dot-open' : 'status-dot-closed'}`}>
          {isEditable ? 'Abierto' : 'Cerrado'}
        </span>
      </div>

      <div className="match-fixture">
        <div className="fixture-team">
          <TeamFlag teamName={match.home_team} />
          <span className="fixture-name">{match.home_team}</span>
        </div>

        <div className="fixture-scores">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            aria-label={`Goles ${match.home_team}`}
            disabled={!isEditable}
            value={prediction.predicted_home_score}
            onChange={(event) =>
              handleScoreChange('predicted_home_score', event.target.value)
            }
          />
          <span className="fixture-vs">:</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            aria-label={`Goles ${match.away_team}`}
            disabled={!isEditable}
            value={prediction.predicted_away_score}
            onChange={(event) =>
              handleScoreChange('predicted_away_score', event.target.value)
            }
          />
        </div>

        <div className="fixture-team fixture-team-away">
          <TeamFlag teamName={match.away_team} />
          <span className="fixture-name">{match.away_team}</span>
        </div>
      </div>

      {!isEditable ? (
        <div className="match-others">
          <button
            type="button"
            className="link-button"
            aria-expanded={showOthers}
            onClick={() => setShowOthers((current) => !current)}
          >
            {showOthers ? 'Ocultar pronósticos del grupo' : 'Ver pronósticos del grupo'}
          </button>

          {showOthers ? (
            <OthersPredictions matchId={match.id} currentPlayerId={currentPlayerId} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
