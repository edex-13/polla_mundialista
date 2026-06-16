import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import MyPredictionResults from './MyPredictionResults.jsx';
import MatchPredictionCard from './MatchPredictionCard.jsx';
import Ranking from './Ranking.jsx';
import ScoreSummary from './ScoreSummary.jsx';

const TABS = [
  { id: 'pronosticos', label: 'Pronósticos' },
  { id: 'resultados', label: 'Mis resultados' },
  { id: 'ranking', label: 'Ranking' },
];

const TAB_INTROS = {
  pronosticos: 'Ingresa tus marcadores para los partidos de hoy.',
  resultados: 'Revisa cómo te fue en cada partido.',
  ranking: 'Posiciones generales de todos los participantes.',
};

function getTodayDateValue() {
  return new Date().toLocaleDateString('en-CA');
}

function createMatchStartDate(match) {
  if (!match.match_time) return null;

  return new Date(`${match.match_date}T${match.match_time}`);
}

function hasMatchStarted(match) {
  const matchStartDate = createMatchStartDate(match);

  return matchStartDate ? matchStartDate <= new Date() : false;
}

function createInitialPredictionsByMatchId(matches, predictions) {
  const predictionsByMatchId = Object.fromEntries(
    predictions.map((prediction) => [
      prediction.match_id,
      {
        predicted_home_score: String(prediction.predicted_home_score),
        predicted_away_score: String(prediction.predicted_away_score),
      },
    ]),
  );

  return Object.fromEntries(
    matches.map((match) => [
      match.id,
      predictionsByMatchId[match.id] ?? {
        predicted_home_score: '',
        predicted_away_score: '',
      },
    ]),
  );
}

function hasIncompletePredictions(matches, predictionsByMatchId) {
  return matches.some((match) => {
    const prediction = predictionsByMatchId[match.id];

    return (
      !prediction ||
      prediction.predicted_home_score === '' ||
      prediction.predicted_away_score === ''
    );
  });
}

export default function PredictionsPage({ player, onLogout }) {
  const [activeTab, setActiveTab] = useState('pronosticos');
  const [matches, setMatches] = useState([]);
  const [predictionsByMatchId, setPredictionsByMatchId] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const todayDate = useMemo(() => getTodayDateValue(), []);
  const editableMatches = useMemo(
    () => matches.filter((match) => !hasMatchStarted(match)),
    [matches],
  );
  const formattedTodayDate = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'full',
      }).format(new Date(`${todayDate}T00:00:00`)),
    [todayDate],
  );

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadMatchesAndPredictions() {
      setIsLoading(true);
      setStatusMessage('');

      const { data: todayMatches, error: matchesError } = await supabase
        .from('matches')
        .select('id, match_date, match_time, home_team, away_team')
        .eq('match_date', todayDate)
        .order('match_time', { ascending: true });

      if (shouldIgnoreResponse) return;

      if (matchesError) {
        setMatches([]);
        setPredictionsByMatchId({});
        setStatusType('error');
        setStatusMessage('Ocurrió un error cargando los partidos');
        setIsLoading(false);
        return;
      }

      const matchIds = todayMatches.map((match) => match.id);

      if (matchIds.length === 0) {
        setMatches([]);
        setPredictionsByMatchId({});
        setIsLoading(false);
        return;
      }

      const { data: existingPredictions, error: predictionsError } = await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('player_id', player.id)
        .in('match_id', matchIds);

      if (shouldIgnoreResponse) return;

      if (predictionsError) {
        setMatches([]);
        setPredictionsByMatchId({});
        setStatusType('error');
        setStatusMessage('Ocurrió un error cargando los pronósticos');
        setIsLoading(false);
        return;
      }

      setMatches(todayMatches);
      setPredictionsByMatchId(
        createInitialPredictionsByMatchId(todayMatches, existingPredictions),
      );
      setIsLoading(false);
    }

    loadMatchesAndPredictions();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [player.id, todayDate]);

  function updatePrediction(matchId, fieldName, fieldValue) {
    setPredictionsByMatchId((currentPredictionsByMatchId) => ({
      ...currentPredictionsByMatchId,
      [matchId]: {
        ...currentPredictionsByMatchId[matchId],
        [fieldName]: fieldValue,
      },
    }));
  }

  async function handleSavePredictions() {
    setStatusMessage('');

    if (editableMatches.length === 0) {
      setStatusType('error');
      setStatusMessage('No hay partidos abiertos para guardar');
      return;
    }

    if (hasIncompletePredictions(editableMatches, predictionsByMatchId)) {
      setStatusType('error');
      setStatusMessage('Debes llenar todos los marcadores');
      return;
    }

    setIsSaving(true);

    const predictionsToSave = editableMatches.map((match) => {
      const prediction = predictionsByMatchId[match.id];

      return {
        player_id: player.id,
        match_id: match.id,
        predicted_home_score: Number(prediction.predicted_home_score),
        predicted_away_score: Number(prediction.predicted_away_score),
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('predictions')
      .upsert(predictionsToSave, { onConflict: 'player_id,match_id' });

    setIsSaving(false);

    if (error) {
      setStatusType('error');
      setStatusMessage('Ocurrió un error guardando los pronósticos');
      return;
    }

    setStatusType('success');
    setStatusMessage('Pronósticos guardados correctamente');
    setRefreshKey((currentRefreshKey) => currentRefreshKey + 1);
  }

  async function handleUpdatePoints() {
    setIsUpdatingPoints(true);
    setStatusMessage('');

    const { error } = await supabase.rpc('calculate_prediction_points');

    setIsUpdatingPoints(false);

    if (error) {
      setStatusType('error');
      setStatusMessage('Error actualizando puntajes');
      return;
    }

    setStatusType('success');
    setStatusMessage('Puntajes actualizados correctamente');
    setRefreshKey((currentRefreshKey) => currentRefreshKey + 1);
  }

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    setStatusMessage('');
  }

  return (
    <section className="predictions-page">
      <header className="app-topbar">
        <div className="brand-block brand-block-compact">
          <span className="brand-mark">PM</span>
          <div>
            <p className="eyebrow">{formattedTodayDate}</p>
            <h1>Hola, {player.name}</h1>
          </div>
        </div>

        <button className="secondary-button" type="button" onClick={onLogout}>
          Salir
        </button>
      </header>

      <ScoreSummary player={player} refreshKey={refreshKey} />

      <nav className="tabs tabs-three" aria-label="Secciones principales">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'tab-active' : ''}
            type="button"
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        <p className="tab-intro">{TAB_INTROS[activeTab]}</p>

        {activeTab === 'pronosticos' ? (
          <>
            {isLoading ? (
              <p className="empty-state">Cargando partidos...</p>
            ) : null}

            {!isLoading && matches.length === 0 ? (
              <p className="empty-state">No hay partidos para hoy</p>
            ) : null}

            {!isLoading && matches.length > 0 ? (
              <>
                <div className="matches-list">
                  {matches.map((match) => (
                    <MatchPredictionCard
                      key={match.id}
                      match={match}
                      isEditable={!hasMatchStarted(match)}
                      prediction={
                        predictionsByMatchId[match.id] ?? {
                          predicted_home_score: '',
                          predicted_away_score: '',
                        }
                      }
                      onPredictionChange={updatePrediction}
                    />
                  ))}
                </div>

                {statusMessage ? (
                  <p className={`message message-${statusType}`}>{statusMessage}</p>
                ) : null}

                <button type="button" disabled={isSaving} onClick={handleSavePredictions}>
                  {isSaving ? 'Guardando...' : 'Guardar pronósticos'}
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {activeTab === 'resultados' ? (
          <>
            <MyPredictionResults player={player} refreshKey={refreshKey} hideTitle />

            {statusMessage ? (
              <p className={`message message-${statusType}`}>{statusMessage}</p>
            ) : null}

            <button
              className="dark-button"
              type="button"
              disabled={isUpdatingPoints}
              onClick={handleUpdatePoints}
            >
              {isUpdatingPoints ? 'Actualizando...' : 'Actualizar puntajes'}
            </button>
          </>
        ) : null}

        {activeTab === 'ranking' ? (
          <Ranking player={player} refreshKey={refreshKey} />
        ) : null}
      </div>
    </section>
  );
}
