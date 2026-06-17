import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import MyPredictionResults from './MyPredictionResults.jsx';
import MatchPredictionCard from './MatchPredictionCard.jsx';
import Ranking from './Ranking.jsx';
import ScoreSummary from './ScoreSummary.jsx';
import AdminPanel from './AdminPanel.jsx';
import PodiumPrediction from './PodiumPrediction.jsx';
import GroupPrediction from './GroupPrediction.jsx';

const RANKING_TAB = { id: 'ranking', label: 'Ranking' };

const BASE_TABS = [
  { id: 'partidos', label: 'Partidos' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'podio', label: 'Podio' },
  { id: 'resultados', label: 'Mis resultados' },
  RANKING_TAB,
];

const ADMIN_TAB = { id: 'admin', label: 'Admin' };

const TAB_INTROS = {
  partidos: 'Pronostica los próximos partidos. Los que ya empezaron quedan cerrados.',
  grupos: 'Elige primero y segundo de cada grupo. Cada acierto exacto suma 0.5 puntos.',
  podio: 'Pronostica el podio del Mundial.',
  resultados: 'Revisa cómo te fue en cada partido.',
  ranking: 'Posiciones generales de todos los participantes.',
  admin: 'Registra los resultados de los partidos y el podio del Mundial.',
};

// Columnas base presentes en producción + las opcionales del seed de Mundial.
const BASE_MATCH_COLUMNS = 'id, match_date, match_time, home_team, away_team';
const EXTENDED_MATCH_COLUMNS = `${BASE_MATCH_COLUMNS}, group_name`;

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

function formatDateHeading(dateValue) {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateValue}T00:00:00`));
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

// Agrupa los partidos por fecha conservando el orden cronológico ya cargado.
function groupMatchesByDate(matches) {
  const groups = [];
  const indexByDate = new Map();

  for (const match of matches) {
    if (!indexByDate.has(match.match_date)) {
      indexByDate.set(match.match_date, groups.length);
      groups.push({ date: match.match_date, matches: [] });
    }

    groups[indexByDate.get(match.match_date)].matches.push(match);
  }

  return groups;
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
  const [activeTab, setActiveTab] = useState(player.is_admin ? 'ranking' : 'partidos');
  const [matches, setMatches] = useState([]);
  const [predictionsByMatchId, setPredictionsByMatchId] = useState({});
  const [openDate, setOpenDate] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const todayDate = useMemo(() => getTodayDateValue(), []);
  const editableMatches = useMemo(
    () => matches.filter((match) => !hasMatchStarted(match)),
    [matches],
  );
  const matchesByDate = useMemo(() => groupMatchesByDate(matches), [matches]);
  // El admin no pronostica ni tiene resultados propios: solo ranking + admin.
  const tabs = useMemo(
    () => (player.is_admin ? [RANKING_TAB, ADMIN_TAB] : BASE_TABS),
    [player.is_admin],
  );

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function loadMatchesAndPredictions() {
      setIsLoading(true);
      setStatusMessage('');

      // Trae partidos de hoy en adelante; intenta incluir group_name y,
      // si esa columna no existe en producción, reintenta con las base.
      let matchesData = null;
      let matchesError = null;

      const extended = await supabase
        .from('matches')
        .select(EXTENDED_MATCH_COLUMNS)
        .gte('match_date', todayDate)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });

      if (extended.error) {
        const base = await supabase
          .from('matches')
          .select(BASE_MATCH_COLUMNS)
          .gte('match_date', todayDate)
          .order('match_date', { ascending: true })
          .order('match_time', { ascending: true });

        matchesData = base.data;
        matchesError = base.error;
      } else {
        matchesData = extended.data;
      }

      if (shouldIgnoreResponse) return;

      if (matchesError) {
        setMatches([]);
        setPredictionsByMatchId({});
        setStatusType('error');
        setStatusMessage('Ocurrió un error cargando los partidos');
        setIsLoading(false);
        return;
      }

      const upcomingMatches = matchesData ?? [];
      const matchIds = upcomingMatches.map((match) => match.id);

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

      setMatches(upcomingMatches);
      setPredictionsByMatchId(
        createInitialPredictionsByMatchId(upcomingMatches, existingPredictions),
      );
      // Abre por defecto la fecha más próxima.
      setOpenDate(upcomingMatches[0]?.match_date ?? null);
      setIsLoading(false);
    }

    loadMatchesAndPredictions();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [player.id, todayDate, refreshKey]);

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

    // Solo guardamos los partidos abiertos que tengan ambos marcadores,
    // así el usuario puede pronosticar por tandas sin que se le exija todo.
    const predictionsToSave = editableMatches
      .filter((match) => {
        const prediction = predictionsByMatchId[match.id];

        return (
          prediction &&
          prediction.predicted_home_score !== '' &&
          prediction.predicted_away_score !== ''
        );
      })
      .map((match) => {
        const prediction = predictionsByMatchId[match.id];

        return {
          player_id: player.id,
          match_id: match.id,
          predicted_home_score: Number(prediction.predicted_home_score),
          predicted_away_score: Number(prediction.predicted_away_score),
          updated_at: new Date().toISOString(),
        };
      });

    if (predictionsToSave.length === 0) {
      setStatusType('error');
      setStatusMessage('Completa al menos un marcador para guardar');
      return;
    }

    setIsSaving(true);

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
    setStatusMessage(
      `Guardado: ${predictionsToSave.length} pronóstico${
        predictionsToSave.length === 1 ? '' : 's'
      }`,
    );
  }

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    setStatusMessage('');
  }

  function toggleDate(dateValue) {
    setOpenDate((current) => (current === dateValue ? null : dateValue));
  }

  return (
    <section className="predictions-page">
      <header className="app-topbar">
        <div className="brand-block brand-block-compact">
          <span className="brand-mark">⚽</span>
          <div>
            <p className="eyebrow">Polla Mundial 2026</p>
            <h1>Hola, {player.name}</h1>
          </div>
        </div>

        <button className="secondary-button" type="button" onClick={onLogout}>
          Salir
        </button>
      </header>

      {player.is_admin ? null : (
        <ScoreSummary player={player} refreshKey={refreshKey} />
      )}

      <nav className={`tabs tabs-count-${tabs.length}`} aria-label="Secciones principales">
        {tabs.map((tab) => (
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

        {activeTab === 'partidos' ? (
          <>
            {isLoading ? <p className="empty-state">Cargando partidos...</p> : null}

            {!isLoading && matches.length === 0 ? (
              <p className="empty-state">No hay partidos próximos</p>
            ) : null}

            {!isLoading && matches.length > 0 ? (
              <>
                <div className="date-groups">
                  {matchesByDate.map((group) => {
                    const isOpen = openDate === group.date;
                    const isToday = group.date === todayDate;
                    const openCount = group.matches.filter(
                      (match) => !hasMatchStarted(match),
                    ).length;

                    return (
                      <section
                        className={`date-group ${isOpen ? 'date-group-open' : ''}`}
                        key={group.date}
                      >
                        <button
                          type="button"
                          className="date-group-head"
                          aria-expanded={isOpen}
                          onClick={() => toggleDate(group.date)}
                        >
                          <span className="date-group-title">
                            {isToday ? <span className="today-tag">Hoy</span> : null}
                            {formatDateHeading(group.date)}
                          </span>
                          <span className="date-group-meta">
                            <span className="date-group-count">
                              {group.matches.length} partido
                              {group.matches.length === 1 ? '' : 's'}
                            </span>
                            {openCount > 0 ? (
                              <span className="date-group-open-count">
                                {openCount} abierto{openCount === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span className="date-group-closed-count">Cerrados</span>
                            )}
                            <span className="date-group-chevron" aria-hidden="true">
                              ⌄
                            </span>
                          </span>
                        </button>

                        {isOpen ? (
                          <div className="matches-list">
                            {group.matches.map((match) => (
                              <MatchPredictionCard
                                key={match.id}
                                match={match}
                                isEditable={!hasMatchStarted(match)}
                                currentPlayerId={player.id}
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
                        ) : null}
                      </section>
                    );
                  })}
                </div>

                {statusMessage ? (
                  <p className={`message message-${statusType}`}>{statusMessage}</p>
                ) : null}

                <button
                  className="save-button"
                  type="button"
                  disabled={isSaving}
                  onClick={handleSavePredictions}
                >
                  {isSaving ? 'Guardando...' : 'Guardar pronósticos'}
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {activeTab === 'grupos' ? (
          <GroupPrediction
            player={player}
            onSaved={() =>
              setRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
            }
          />
        ) : null}

        {activeTab === 'podio' ? (
          <PodiumPrediction
            player={player}
            onSaved={() =>
              setRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
            }
          />
        ) : null}

        {activeTab === 'resultados' ? (
          <MyPredictionResults player={player} refreshKey={refreshKey} hideTitle />
        ) : null}

        {activeTab === 'ranking' ? (
          <Ranking player={player} refreshKey={refreshKey} />
        ) : null}

        {activeTab === 'admin' && player.is_admin ? (
          <AdminPanel
            onPointsRecalculated={() =>
              setRefreshKey((currentRefreshKey) => currentRefreshKey + 1)
            }
          />
        ) : null}
      </div>
    </section>
  );
}
