import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import TeamFlag from './TeamFlag.jsx';
import TeamPicker from './TeamPicker.jsx';

const EMPTY_NEW_MATCH = {
  match_date: '',
  match_time: '',
  home_team: '',
  away_team: '',
  group_name: '',
};

const PODIUM_SLOTS = [
  { key: 'champion', label: 'Campeón', medal: '🥇' },
  { key: 'runner_up', label: 'Subcampeón', medal: '🥈' },
  { key: 'third_place', label: 'Tercer lugar', medal: '🥉' },
];

const GROUP_RESULT_SLOTS = [
  { key: 'first_place', label: '1º del grupo' },
  { key: 'second_place', label: '2º del grupo' },
];

function normalizeScore(value) {
  if (value === '') return '';

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) return '';

  return String(parsed);
}

function formatMatchTime(matchTime) {
  return matchTime ? matchTime.slice(0, 5) : '';
}

function formatDateHeading(dateValue) {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateValue}T00:00:00`));
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

function getGroupSortValue(groupName) {
  const match = (groupName ?? '').match(/[A-Z]$/i);

  return match ? match[0].toUpperCase().charCodeAt(0) : 999;
}

function createGroupsFromMatches(matches) {
  const teamsByGroupName = new Map();

  for (const match of matches) {
    if (!match.group_name) continue;

    if (!teamsByGroupName.has(match.group_name)) {
      teamsByGroupName.set(match.group_name, new Set());
    }

    teamsByGroupName.get(match.group_name).add(match.home_team);
    teamsByGroupName.get(match.group_name).add(match.away_team);
  }

  return Array.from(teamsByGroupName.entries())
    .map(([name, teams]) => ({ name, teams: Array.from(teams).sort() }))
    .sort((left, right) => getGroupSortValue(left.name) - getGroupSortValue(right.name));
}

function buildInitialScores(matches) {
  return Object.fromEntries(
    matches.map((match) => [
      match.id,
      {
        home: match.home_score == null ? '' : String(match.home_score),
        away: match.away_score == null ? '' : String(match.away_score),
      },
    ]),
  );
}

export default function AdminPanel({ onPointsRecalculated }) {
  const [matches, setMatches] = useState([]);
  const [scoresByMatchId, setScoresByMatchId] = useState({});
  const [openDate, setOpenDate] = useState(null);
  const [savingMatchId, setSavingMatchId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showNewMatchForm, setShowNewMatchForm] = useState(false);
  const [newMatch, setNewMatch] = useState(EMPTY_NEW_MATCH);
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [realPodium, setRealPodium] = useState({
    champion: '',
    runner_up: '',
    third_place: '',
  });
  const [realGroupResultsByName, setRealGroupResultsByName] = useState({});
  const [savingGroupName, setSavingGroupName] = useState(null);
  const [isSavingPodium, setIsSavingPodium] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');
  const [reloadKey, setReloadKey] = useState(0);

  const todayDate = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadMatches() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('matches')
        .select('id, match_date, match_time, home_team, away_team, home_score, away_score, status, group_name')
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true });

      if (shouldIgnore) return;

      if (error) {
        setMatches([]);
        setStatusType('error');
        setStatusMessage('No se pudieron cargar los partidos');
      } else {
        const loaded = data ?? [];
        setMatches(loaded);
        setScoresByMatchId(buildInitialScores(loaded));
        // Abre por defecto la fecha de hoy si existe; si no, la primera.
        setOpenDate((current) => {
          if (current) return current;
          const todayGroup = loaded.find((match) => match.match_date === todayDate);
          return todayGroup?.match_date ?? loaded[0]?.match_date ?? null;
        });
      }

      setIsLoading(false);
    }

    async function loadRealPodium() {
      const { data } = await supabase
        .from('tournament_result')
        .select('champion, runner_up, third_place')
        .eq('id', 1)
        .maybeSingle();

      if (shouldIgnore || !data) return;

      setRealPodium({
        champion: data.champion ?? '',
        runner_up: data.runner_up ?? '',
        third_place: data.third_place ?? '',
      });
    }

    async function loadRealGroups() {
      const { data } = await supabase
        .from('group_results')
        .select('group_name, first_place, second_place');

      if (shouldIgnore) return;

      setRealGroupResultsByName(
        Object.fromEntries(
          (data ?? []).map((groupResult) => [
            groupResult.group_name,
            {
              first_place: groupResult.first_place ?? '',
              second_place: groupResult.second_place ?? '',
            },
          ]),
        ),
      );
    }

    loadMatches();
    loadRealPodium();
    loadRealGroups();

    return () => {
      shouldIgnore = true;
    };
  }, [reloadKey, todayDate]);

  const matchesByDate = useMemo(() => groupMatchesByDate(matches), [matches]);
  const groups = useMemo(() => createGroupsFromMatches(matches), [matches]);

  function updateScore(matchId, side, value) {
    setScoresByMatchId((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [side]: normalizeScore(value),
      },
    }));
  }

  function toggleDate(dateValue) {
    setOpenDate((current) => (current === dateValue ? null : dateValue));
  }

  async function handleSaveResult(match) {
    setStatusMessage('');

    const score = scoresByMatchId[match.id] ?? { home: '', away: '' };

    if (score.home === '' || score.away === '') {
      setStatusType('error');
      setStatusMessage(`Ingresa ambos marcadores de ${match.home_team} vs ${match.away_team}`);
      return;
    }

    setSavingMatchId(match.id);

    // Guarda el resultado y marca como finalizado. El trigger de la BD
    // recalcula los puntos de todas las predicciones automáticamente.
    const { error } = await supabase
      .from('matches')
      .update({
        home_score: Number(score.home),
        away_score: Number(score.away),
        status: 'finished',
      })
      .eq('id', match.id);

    setSavingMatchId(null);

    if (error) {
      setStatusType('error');
      setStatusMessage('Error guardando el resultado');
      return;
    }

    setStatusType('success');
    setStatusMessage(
      `Guardado: ${match.home_team} ${score.home} - ${score.away} ${match.away_team}`,
    );
    setReloadKey((key) => key + 1);
    onPointsRecalculated?.();
  }

  function updateNewMatch(field, value) {
    setNewMatch((current) => ({ ...current, [field]: value }));
  }

  async function handleAddMatch() {
    setStatusMessage('');

    const homeTeam = newMatch.home_team.trim();
    const awayTeam = newMatch.away_team.trim();

    if (!newMatch.match_date || !homeTeam || !awayTeam) {
      setStatusType('error');
      setStatusMessage('Completa fecha y los dos equipos');
      return;
    }

    if (homeTeam.toLowerCase() === awayTeam.toLowerCase()) {
      setStatusType('error');
      setStatusMessage('Los equipos deben ser distintos');
      return;
    }

    setIsAddingMatch(true);

    // Inserta el partido. group_name y match_time son opcionales; si la
    // columna group_name no existiera en producción, se reintenta sin ella.
    const baseRow = {
      match_date: newMatch.match_date,
      match_time: newMatch.match_time || null,
      home_team: homeTeam,
      away_team: awayTeam,
      status: 'scheduled',
    };
    const groupName = newMatch.group_name.trim();

    let { error } = await supabase
      .from('matches')
      .insert(groupName ? { ...baseRow, group_name: groupName } : baseRow);

    if (error && groupName) {
      // Posible ausencia de la columna group_name: reintenta sin ella.
      ({ error } = await supabase.from('matches').insert(baseRow));
    }

    setIsAddingMatch(false);

    if (error) {
      setStatusType('error');
      setStatusMessage('Error agregando el partido');
      return;
    }

    setStatusType('success');
    setStatusMessage(`Partido agregado: ${homeTeam} vs ${awayTeam}`);
    setNewMatch(EMPTY_NEW_MATCH);
    setShowNewMatchForm(false);
    setOpenDate(baseRow.match_date);
    setReloadKey((key) => key + 1);
  }

  function updateRealPodium(slotKey, value) {
    setRealPodium((current) => ({ ...current, [slotKey]: value }));
  }

  function updateRealGroupResult(groupName, slotKey, value) {
    setRealGroupResultsByName((current) => ({
      ...current,
      [groupName]: {
        first_place: '',
        second_place: '',
        ...current[groupName],
        [slotKey]: value,
      },
    }));
  }

  async function handleSaveRealPodium() {
    setStatusMessage('');

    const champion = realPodium.champion.trim();
    const runnerUp = realPodium.runner_up.trim();
    const thirdPlace = realPodium.third_place.trim();

    // Permite guardar parcial (ej. solo campeón si aún no hay 3º), pero los
    // que se llenen deben ser distintos entre sí.
    const filled = [champion, runnerUp, thirdPlace].filter(Boolean);
    const uniqueFilled = new Set(filled.map((team) => team.toLowerCase()));

    if (uniqueFilled.size < filled.length) {
      setStatusType('error');
      setStatusMessage('Los equipos del podio deben ser distintos');
      return;
    }

    setIsSavingPodium(true);

    // El trigger de la BD recalcula los puntos del podio automáticamente.
    const { error } = await supabase.from('tournament_result').upsert(
      {
        id: 1,
        champion: champion || null,
        runner_up: runnerUp || null,
        third_place: thirdPlace || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    setIsSavingPodium(false);

    if (error) {
      setStatusType('error');
      setStatusMessage('Error guardando el podio real');
      return;
    }

    setStatusType('success');
    setStatusMessage('Podio del Mundial registrado. Puntajes actualizados.');
    onPointsRecalculated?.();
  }

  async function handleSaveRealGroup(group) {
    setStatusMessage('');

    const groupResult = realGroupResultsByName[group.name] ?? {};
    const firstPlace = groupResult.first_place?.trim() ?? '';
    const secondPlace = groupResult.second_place?.trim() ?? '';

    if (!firstPlace || !secondPlace) {
      setStatusType('error');
      setStatusMessage(`Completa primero y segundo de ${group.name}`);
      return;
    }

    if (firstPlace.toLowerCase() === secondPlace.toLowerCase()) {
      setStatusType('error');
      setStatusMessage(`Los equipos de ${group.name} deben ser distintos`);
      return;
    }

    setSavingGroupName(group.name);

    const { error } = await supabase.from('group_results').upsert(
      {
        group_name: group.name,
        first_place: firstPlace,
        second_place: secondPlace,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'group_name' },
    );

    setSavingGroupName(null);

    if (error) {
      setStatusType('error');
      setStatusMessage(`Error guardando ${group.name}`);
      return;
    }

    setStatusType('success');
    setStatusMessage(`${group.name} guardado. Puntajes de grupos actualizados.`);
    onPointsRecalculated?.();
  }

  async function handleRecalculateAll() {
    setIsRecalculating(true);
    setStatusMessage('');

    // Recalcula puntos de partidos, grupos y podio del Mundial.
    const matchPoints = await supabase.rpc('calculate_prediction_points');
    const groupPoints = await supabase.rpc('calculate_group_points');
    const podiumPoints = await supabase.rpc('calculate_tournament_points');

    setIsRecalculating(false);

    if (matchPoints.error || groupPoints.error || podiumPoints.error) {
      setStatusType('error');
      setStatusMessage('Error recalculando los puntajes');
      return;
    }

    setStatusType('success');
    setStatusMessage('Puntajes recalculados para todos los participantes');
    onPointsRecalculated?.();
  }

  return (
    <section className="admin-panel">
      <div className="admin-banner">
        <span className="admin-badge">ADMIN</span>
        <p>Registra los resultados día a día.</p>
      </div>

      {statusMessage ? (
        <p className={`message message-${statusType}`}>{statusMessage}</p>
      ) : null}

      <div className="admin-card">
        <div className="admin-card-head">
          <h3>Agregar partido</h3>
          <button
            type="button"
            className="link-button admin-toggle"
            aria-expanded={showNewMatchForm}
            onClick={() => setShowNewMatchForm((current) => !current)}
          >
            {showNewMatchForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>

        {showNewMatchForm ? (
          <div className="new-match-form">
            <div className="new-match-row">
              <label className="admin-field">
                <span>Fecha</span>
                <input
                  type="date"
                  value={newMatch.match_date}
                  onChange={(event) => updateNewMatch('match_date', event.target.value)}
                />
              </label>
              <label className="admin-field">
                <span>Hora</span>
                <input
                  type="time"
                  value={newMatch.match_time}
                  onChange={(event) => updateNewMatch('match_time', event.target.value)}
                />
              </label>
            </div>

            <div className="admin-field">
              <TeamPicker
                label="Equipo local"
                placeholder="Selecciona el local"
                value={newMatch.home_team}
                excluded={[newMatch.away_team]}
                onChange={(team) => updateNewMatch('home_team', team)}
              />
            </div>

            <div className="admin-field">
              <TeamPicker
                label="Equipo visitante"
                placeholder="Selecciona el visitante"
                value={newMatch.away_team}
                excluded={[newMatch.home_team]}
                onChange={(team) => updateNewMatch('away_team', team)}
              />
            </div>

            <label className="admin-field">
              <span>Fase / grupo (opcional)</span>
              <input
                type="text"
                placeholder="Ej: Grupo K, Octavos…"
                value={newMatch.group_name}
                onChange={(event) => updateNewMatch('group_name', event.target.value)}
              />
            </label>

            <button type="button" disabled={isAddingMatch} onClick={handleAddMatch}>
              {isAddingMatch ? 'Agregando...' : 'Agregar partido'}
            </button>
          </div>
        ) : (
          <p className="admin-hint">Crea un partido nuevo para que todos lo pronostiquen.</p>
        )}
      </div>

      {isLoading ? (
        <p className="empty-state">Cargando partidos...</p>
      ) : matches.length === 0 ? (
        <p className="empty-state">No hay partidos cargados</p>
      ) : (
        <div className="date-groups">
          {matchesByDate.map((group) => {
            const isOpen = openDate === group.date;
            const isToday = group.date === todayDate;
            const pendingCount = group.matches.filter(
              (match) => match.status !== 'finished',
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
                    {pendingCount > 0 ? (
                      <span className="date-group-open-count">
                        {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="date-group-closed-count">Completo</span>
                    )}
                    <span className="date-group-chevron" aria-hidden="true">
                      ⌄
                    </span>
                  </span>
                </button>

                {isOpen ? (
                  <div className="matches-list">
                    {group.matches.map((match) => {
                      const score = scoresByMatchId[match.id] ?? { home: '', away: '' };
                      const isFinished = match.status === 'finished';
                      const isSaving = savingMatchId === match.id;

                      return (
                        <article className="admin-match" key={match.id}>
                          <div className="admin-match-top">
                            <span className="match-time-pill">
                              {formatMatchTime(match.match_time)}
                            </span>
                            {isFinished ? (
                              <span className="status-dot status-dot-finished">
                                Finalizado
                              </span>
                            ) : (
                              <span className="status-dot status-dot-pending">
                                Pendiente
                              </span>
                            )}
                          </div>

                          <div className="admin-result">
                            <div className="admin-result-team">
                              <TeamFlag teamName={match.home_team} />
                              <span>{match.home_team}</span>
                            </div>

                            <div className="admin-result-scores">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                aria-label={`Goles ${match.home_team}`}
                                value={score.home}
                                onChange={(event) =>
                                  updateScore(match.id, 'home', event.target.value)
                                }
                              />
                              <span className="admin-result-vs">:</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                aria-label={`Goles ${match.away_team}`}
                                value={score.away}
                                onChange={(event) =>
                                  updateScore(match.id, 'away', event.target.value)
                                }
                              />
                            </div>

                            <div className="admin-result-team admin-result-team-away">
                              <TeamFlag teamName={match.away_team} />
                              <span>{match.away_team}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={isFinished ? 'secondary-wide-button' : ''}
                            disabled={isSaving}
                            onClick={() => handleSaveResult(match)}
                          >
                            {isSaving
                              ? 'Guardando...'
                              : isFinished
                                ? 'Actualizar resultado'
                                : 'Guardar resultado'}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <div className="admin-card">
        <h3>Clasificados reales por grupo</h3>
        <p className="admin-hint">
          Registra el primero y segundo real de cada grupo. Cada acierto exacto
          suma 0.5 puntos.
        </p>

        {groups.length === 0 ? (
          <p className="empty-state">No hay grupos cargados</p>
        ) : (
          <div className="admin-groups">
            {groups.map((group) => {
              const groupResult = realGroupResultsByName[group.name] ?? {
                first_place: '',
                second_place: '',
              };
              const isSavingGroup = savingGroupName === group.name;

              return (
                <section className="admin-group-card" key={group.name}>
                  <div className="admin-group-head">
                    <h4>{group.name}</h4>
                    <span>{group.teams.length} equipos</span>
                  </div>

                  <div className="group-teams">
                    {group.teams.map((team) => (
                      <span className="group-team-chip" key={team}>
                        <TeamFlag teamName={team} size="sm" />
                        {team}
                      </span>
                    ))}
                  </div>

                  <div className="new-match-form">
                    {GROUP_RESULT_SLOTS.map((slot) => (
                      <div className="admin-field" key={slot.key}>
                        <TeamPicker
                          label={slot.label}
                          placeholder="Equipo"
                          value={groupResult[slot.key]}
                          options={group.teams}
                          excluded={GROUP_RESULT_SLOTS.filter(
                            (other) => other.key !== slot.key,
                          ).map((other) => groupResult[other.key])}
                          onChange={(team) =>
                            updateRealGroupResult(group.name, slot.key, team)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="secondary-wide-button"
                    disabled={isSavingGroup}
                    onClick={() => handleSaveRealGroup(group)}
                  >
                    {isSavingGroup ? 'Guardando...' : `Guardar ${group.name}`}
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="admin-card">
        <h3>Podio real del Mundial</h3>
        <p className="admin-hint">
          Registra cómo quedó el podio. Al guardar, se calculan automáticamente
          los puntos del pronóstico del campeón de cada participante.
        </p>

        <div className="new-match-form">
          {PODIUM_SLOTS.map((slot) => (
            <div className="admin-field" key={slot.key}>
              <TeamPicker
                label={`${slot.medal} ${slot.label}`}
                placeholder="Equipo"
                value={realPodium[slot.key]}
                excluded={PODIUM_SLOTS.filter((other) => other.key !== slot.key).map(
                  (other) => realPodium[other.key],
                )}
                onChange={(team) => updateRealPodium(slot.key, team)}
              />
            </div>
          ))}

          <button type="button" disabled={isSavingPodium} onClick={handleSaveRealPodium}>
            {isSavingPodium ? 'Guardando...' : 'Guardar podio real'}
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h3>Recalcular puntajes</h3>
        <p className="admin-hint">
          Vuelve a calcular los puntos de todos según los resultados registrados.
          Útil si corriges un marcador.
        </p>
        <button
          className="dark-button"
          type="button"
          disabled={isRecalculating}
          onClick={handleRecalculateAll}
        >
          {isRecalculating ? 'Recalculando...' : 'Recalcular todo el puntaje'}
        </button>
      </div>
    </section>
  );
}
