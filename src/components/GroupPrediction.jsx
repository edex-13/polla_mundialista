import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import TeamFlag from './TeamFlag.jsx';
import TeamPicker from './TeamPicker.jsx';

const DEADLINE = new Date('2026-06-17T23:59:59-05:00');
const GROUP_MATCH_COLUMNS = 'group_name, home_team, away_team';

function normalizeGroupName(groupName) {
  return groupName?.trim() || 'Sin grupo';
}

function getGroupSortValue(groupName) {
  const match = normalizeGroupName(groupName).match(/[A-Z]$/i);

  return match ? match[0].toUpperCase().charCodeAt(0) : 999;
}

function createGroupsFromMatches(matches) {
  const teamsByGroupName = new Map();

  for (const match of matches) {
    const groupName = normalizeGroupName(match.group_name);

    if (!teamsByGroupName.has(groupName)) {
      teamsByGroupName.set(groupName, new Set());
    }

    teamsByGroupName.get(groupName).add(match.home_team);
    teamsByGroupName.get(groupName).add(match.away_team);
  }

  return Array.from(teamsByGroupName.entries())
    .map(([name, teams]) => ({ name, teams: Array.from(teams).sort() }))
    .filter((group) => group.teams.length > 0)
    .sort((left, right) => getGroupSortValue(left.name) - getGroupSortValue(right.name));
}

function createInitialPicks(groups, predictions) {
  const predictionsByGroupName = Object.fromEntries(
    predictions.map((prediction) => [
      prediction.group_name,
      {
        first_place: prediction.first_place ?? '',
        second_place: prediction.second_place ?? '',
      },
    ]),
  );

  return Object.fromEntries(
    groups.map((group) => [
      group.name,
      predictionsByGroupName[group.name] ?? { first_place: '', second_place: '' },
    ]),
  );
}

function formatDeadline() {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
  }).format(DEADLINE);
}

export default function GroupPrediction({ player, onSaved }) {
  const [groups, setGroups] = useState([]);
  const [picksByGroupName, setPicksByGroupName] = useState({});
  const [openGroupName, setOpenGroupName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');

  const isClosed = useMemo(() => new Date() > DEADLINE, []);
  const completedGroupCount = useMemo(
    () =>
      Object.values(picksByGroupName).filter(
        (pick) => pick.first_place && pick.second_place,
      ).length,
    [picksByGroupName],
  );

  useEffect(() => {
    let shouldIgnore = false;

    async function loadGroupsAndPredictions() {
      setIsLoading(true);
      setStatusMessage('');

      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(GROUP_MATCH_COLUMNS)
        .not('group_name', 'is', null)
        .order('group_name', { ascending: true });

      if (shouldIgnore) return;

      if (matchesError) {
        setGroups([]);
        setPicksByGroupName({});
        setStatusType('error');
        setStatusMessage('No se pudieron cargar los grupos');
        setIsLoading(false);
        return;
      }

      const loadedGroups = createGroupsFromMatches(matches ?? []);

      if (loadedGroups.length === 0) {
        setGroups([]);
        setPicksByGroupName({});
        setIsLoading(false);
        return;
      }

      const { data: predictions, error: predictionsError } = await supabase
        .from('group_predictions')
        .select('group_name, first_place, second_place')
        .eq('player_id', player.id);

      if (shouldIgnore) return;

      if (predictionsError) {
        setGroups(loadedGroups);
        setPicksByGroupName(createInitialPicks(loadedGroups, []));
        setStatusType('error');
        setStatusMessage('No se pudieron cargar tus predicciones de grupos');
        setIsLoading(false);
        return;
      }

      setGroups(loadedGroups);
      setPicksByGroupName(createInitialPicks(loadedGroups, predictions ?? []));
      setOpenGroupName(loadedGroups[0]?.name ?? null);
      setIsLoading(false);
    }

    loadGroupsAndPredictions();

    return () => {
      shouldIgnore = true;
    };
  }, [player.id]);

  function updatePick(groupName, fieldName, value) {
    setPicksByGroupName((current) => ({
      ...current,
      [groupName]: {
        ...current[groupName],
        [fieldName]: value,
      },
    }));
  }

  async function handleSave() {
    setStatusMessage('');

    const rowsToSave = groups
      .map((group) => {
        const pick = picksByGroupName[group.name] ?? {};
        const firstPlace = pick.first_place?.trim() ?? '';
        const secondPlace = pick.second_place?.trim() ?? '';

        return {
          group,
          firstPlace,
          secondPlace,
        };
      })
      .filter(({ firstPlace, secondPlace }) => firstPlace || secondPlace);

    const invalidGroup = rowsToSave.find(
      ({ firstPlace, secondPlace }) => !firstPlace || !secondPlace,
    );

    if (invalidGroup) {
      setStatusType('error');
      setStatusMessage(`Completa primero y segundo de ${invalidGroup.group.name}`);
      setOpenGroupName(invalidGroup.group.name);
      return;
    }

    const repeatedGroup = rowsToSave.find(
      ({ firstPlace, secondPlace }) => firstPlace.toLowerCase() === secondPlace.toLowerCase(),
    );

    if (repeatedGroup) {
      setStatusType('error');
      setStatusMessage(`Los equipos de ${repeatedGroup.group.name} deben ser distintos`);
      setOpenGroupName(repeatedGroup.group.name);
      return;
    }

    if (rowsToSave.length === 0) {
      setStatusType('error');
      setStatusMessage('Completa al menos un grupo para guardar');
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from('group_predictions').upsert(
      rowsToSave.map(({ group, firstPlace, secondPlace }) => ({
        player_id: player.id,
        group_name: group.name,
        first_place: firstPlace,
        second_place: secondPlace,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'player_id,group_name' },
    );

    setIsSaving(false);

    if (error) {
      setStatusType('error');
      setStatusMessage('Ocurrió un error guardando los grupos');
      return;
    }

    setStatusType('success');
    setStatusMessage(`Guardado: ${rowsToSave.length} grupo${rowsToSave.length === 1 ? '' : 's'}`);
    onSaved?.();
  }

  return (
    <section className="group-prediction">
      <header className="section-card-head">
        <div>
          <p className="eyebrow">Predicción por grupos</p>
          <h3>Primero y segundo de cada grupo</h3>
        </div>
        <span className={`podium-deadline ${isClosed ? 'podium-deadline-closed' : ''}`}>
          {isClosed ? 'Cerrado' : `Hasta el ${formatDeadline()}`}
        </span>
      </header>

      <div className="podium-legend">
        <p>
          Cada puesto exacto suma <strong>+0.5 puntos</strong>. Puedes guardar por tandas.
        </p>
        <p>
          Avance: <strong>{completedGroupCount}</strong> de <strong>{groups.length}</strong>{' '}
          grupos completos.
        </p>
      </div>

      {isLoading ? <p className="empty-state">Cargando grupos...</p> : null}

      {!isLoading && groups.length === 0 ? (
        <p className="empty-state">No hay grupos cargados</p>
      ) : null}

      {!isLoading && groups.length > 0 ? (
        <>
          <div className="group-accordion">
            {groups.map((group) => {
              const isOpen = openGroupName === group.name;
              const pick = picksByGroupName[group.name] ?? {
                first_place: '',
                second_place: '',
              };
              const isComplete = pick.first_place && pick.second_place;

              return (
                <section
                  className={`group-card ${isOpen ? 'group-card-open' : ''}`}
                  key={group.name}
                >
                  <button
                    type="button"
                    className="group-card-head"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenGroupName((current) => (current === group.name ? null : group.name))
                    }
                  >
                    <span className="group-card-title">{group.name}</span>
                    <span className="group-card-meta">
                      <span className={isComplete ? 'group-ready' : 'group-pending'}>
                        {isComplete ? 'Completo' : 'Pendiente'}
                      </span>
                      <span className="date-group-chevron" aria-hidden="true">
                       ⌄
                      </span>
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="group-card-body">
                      <div className="group-teams">
                        {group.teams.map((team) => (
                          <span className="group-team-chip" key={team}>
                            <TeamFlag teamName={team} size="sm" />
                            {team}
                          </span>
                        ))}
                      </div>

                      <div className="group-picks">
                        <TeamPicker
                          label="1º del grupo"
                          placeholder="Primero"
                          value={pick.first_place}
                          disabled={isClosed}
                          options={group.teams}
                          excluded={[pick.second_place]}
                          onChange={(team) => updatePick(group.name, 'first_place', team)}
                        />
                        <TeamPicker
                          label="2º del grupo"
                          placeholder="Segundo"
                          value={pick.second_place}
                          disabled={isClosed}
                          options={group.teams}
                          excluded={[pick.first_place]}
                          onChange={(team) => updatePick(group.name, 'second_place', team)}
                        />
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>

          {statusMessage ? (
            <p className={`message message-${statusType}`}>{statusMessage}</p>
          ) : null}

          {isClosed ? (
            <p className="podium-closed-note">El plazo para predicción de grupos ya cerró.</p>
          ) : (
            <button type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Guardando...' : 'Guardar grupos'}
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}
