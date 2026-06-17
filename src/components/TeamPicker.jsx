import { useEffect, useMemo, useRef, useState } from 'react';
import TeamFlag from './TeamFlag.jsx';
import { TEAM_NAMES } from '../lib/countries.js';

function normalize(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

// Selector de equipo en forma de hoja inferior (bottom sheet) con buscador
// y banderas. Pensado para móvil: tocas, buscas, eliges. Reutilizable.
export default function TeamPicker({
  label,
  value,
  placeholder = 'Selecciona un equipo',
  disabled = false,
  excluded = [],
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  const excludedSet = useMemo(
    () => new Set(excluded.filter(Boolean).map((team) => normalize(team))),
    [excluded],
  );

  const filteredTeams = useMemo(() => {
    const normalizedQuery = normalize(query);

    return TEAM_NAMES.filter((team) => {
      const isExcluded = excludedSet.has(normalize(team)) && normalize(team) !== normalize(value);

      if (isExcluded) return false;

      if (!normalizedQuery) return true;

      return normalize(team).includes(normalizedQuery);
    });
  }, [query, excludedSet, value]);

  // Bloquea el scroll del fondo y enfoca el buscador al abrir.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => searchRef.current?.focus(), 50);

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function openSheet() {
    if (disabled) return;
    setQuery('');
    setIsOpen(true);
  }

  function selectTeam(team) {
    onChange(team);
    setIsOpen(false);
  }

  return (
    <div className="team-picker">
      {label ? <span className="team-picker-label">{label}</span> : null}

      <button
        type="button"
        className={`team-picker-trigger ${value ? 'team-picker-trigger-filled' : ''}`}
        disabled={disabled}
        onClick={openSheet}
      >
        {value ? (
          <>
            <TeamFlag teamName={value} size="sm" />
            <span className="team-picker-value">{value}</span>
          </>
        ) : (
          <span className="team-picker-placeholder">{placeholder}</span>
        )}
        {!disabled ? <span className="team-picker-caret" aria-hidden="true">⌄</span> : null}
      </button>

      {isOpen ? (
        <div
          className="sheet-overlay"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label || 'Seleccionar equipo'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" aria-hidden="true" />

            <div className="sheet-header">
              <h3>{label || 'Elige un equipo'}</h3>
              <button
                type="button"
                className="sheet-close"
                aria-label="Cerrar"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="sheet-search">
              <span className="sheet-search-icon" aria-hidden="true">🔍</span>
              <input
                ref={searchRef}
                type="text"
                inputMode="search"
                placeholder="Buscar equipo…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  type="button"
                  className="sheet-search-clear"
                  aria-label="Limpiar"
                  onClick={() => setQuery('')}
                >
                  ✕
                </button>
              ) : null}
            </div>

            <ul className="sheet-list">
              {filteredTeams.length === 0 ? (
                <li className="sheet-empty">Sin resultados para “{query}”.</li>
              ) : (
                filteredTeams.map((team) => (
                  <li key={team}>
                    <button
                      type="button"
                      className={`sheet-option ${
                        normalize(team) === normalize(value) ? 'sheet-option-selected' : ''
                      }`}
                      onClick={() => selectTeam(team)}
                    >
                      <TeamFlag teamName={team} />
                      <span>{team}</span>
                      {normalize(team) === normalize(value) ? (
                        <span className="sheet-check" aria-hidden="true">✓</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
