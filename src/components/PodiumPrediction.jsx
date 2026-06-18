import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import TeamPicker from './TeamPicker.jsx';

// Fecha límite para registrar/editar el podio del Mundial.
const DEADLINE = new Date('2026-06-18T10:59:00-05:00');

const SLOTS = [
  { key: 'champion', label: 'Campeón', medal: '🥇', points: 10 },
  { key: 'runner_up', label: 'Subcampeón', medal: '🥈', points: 8 },
  { key: 'third_place', label: 'Tercer lugar', medal: '🥉', points: 5 },
];

function formatDeadline() {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
  }).format(DEADLINE);
}

export default function PodiumPrediction({ player, onSaved }) {
  const [picks, setPicks] = useState({ champion: '', runner_up: '', third_place: '' });
  const [savedPicks, setSavedPicks] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');

  // El cierre se evalúa una sola vez al montar (la fecha no cambia en sesión).
  const isClosed = useMemo(() => new Date() > DEADLINE, []);

  useEffect(() => {
    let shouldIgnore = false;

    async function loadPodium() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('tournament_predictions')
        .select('champion, runner_up, third_place, points')
        .eq('player_id', player.id)
        .maybeSingle();

      if (shouldIgnore) return;

      if (!error && data) {
        const loaded = {
          champion: data.champion ?? '',
          runner_up: data.runner_up ?? '',
          third_place: data.third_place ?? '',
        };
        setPicks(loaded);
        setSavedPicks(loaded);
      }

      setIsLoading(false);
    }

    loadPodium();

    return () => {
      shouldIgnore = true;
    };
  }, [player.id]);

  function updatePick(slotKey, value) {
    setPicks((current) => ({ ...current, [slotKey]: value }));
  }

  async function handleSave() {
    setStatusMessage('');

    const champion = picks.champion.trim();
    const runnerUp = picks.runner_up.trim();
    const thirdPlace = picks.third_place.trim();

    if (!champion || !runnerUp || !thirdPlace) {
      setStatusType('error');
      setStatusMessage('Completa los tres puestos del podio');
      return;
    }

    const unique = new Set([
      champion.toLowerCase(),
      runnerUp.toLowerCase(),
      thirdPlace.toLowerCase(),
    ]);

    if (unique.size < 3) {
      setStatusType('error');
      setStatusMessage('Los tres equipos deben ser distintos');
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from('tournament_predictions').upsert(
      {
        player_id: player.id,
        champion,
        runner_up: runnerUp,
        third_place: thirdPlace,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player_id' },
    );

    setIsSaving(false);

    if (error) {
      setStatusType('error');
      setStatusMessage('Ocurrió un error guardando tu podio');
      return;
    }

    setStatusType('success');
    setStatusMessage('Podio guardado correctamente');
    setSavedPicks({ champion, runner_up: runnerUp, third_place: thirdPlace });
    onSaved?.();
  }

  return (
    <section className="podium-card">
      <header className="podium-card-head">
        <div>
          <p className="eyebrow">Pronóstico del Mundial</p>
          <h3>¿Quién sube al podio?</h3>
        </div>
        <span className={`podium-deadline ${isClosed ? 'podium-deadline-closed' : ''}`}>
          {isClosed ? 'Cerrado' : `Hasta el ${formatDeadline()}`}
        </span>
      </header>

      <div className="podium-legend">
        <p>
          Acierta la <strong>posición exacta</strong> y suma:{' '}
          <span className="podium-pts">🥇 10</span> ·{' '}
          <span className="podium-pts">🥈 8</span> ·{' '}
          <span className="podium-pts">🥉 5</span>.
        </p>
        <p>
          Si un equipo que elegiste queda en el podio pero en{' '}
          <strong>otra posición</strong>, igual sumas <strong>+1</strong> por ese equipo.
        </p>
      </div>

      {isLoading ? (
        <p className="empty-state">Cargando tu podio...</p>
      ) : (
        <>
          <div className="podium-slots">
            {SLOTS.map((slot) => (
              <div className="podium-slot" key={slot.key}>
                <span className="podium-slot-label">
                  <span className="podium-slot-medal">{slot.medal}</span>
                  {slot.label}
                  <span className="podium-slot-points">+{slot.points}</span>
                </span>
                <TeamPicker
                  value={picks[slot.key]}
                  disabled={isClosed}
                  excluded={SLOTS.filter((other) => other.key !== slot.key).map(
                    (other) => picks[other.key],
                  )}
                  onChange={(team) => updatePick(slot.key, team)}
                />
              </div>
            ))}
          </div>

          {statusMessage ? (
            <p className={`message message-${statusType}`}>{statusMessage}</p>
          ) : null}

          {isClosed ? (
            <p className="podium-closed-note">
              El plazo para pronosticar el podio ya cerró.
              {savedPicks ? ' Tu podio quedó registrado.' : ''}
            </p>
          ) : (
            <button type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Guardando...' : savedPicks ? 'Actualizar podio' : 'Guardar podio'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
