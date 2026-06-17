import { useState } from 'react';
import { getFlagUrl, getTeamInitials } from '../lib/countries.js';

// Muestra la bandera del equipo. Si no hay código de país o la imagen
// falla en cargar, cae a un avatar con las iniciales del equipo.
export default function TeamFlag({ teamName, size = 'md' }) {
  const [hasImageError, setHasImageError] = useState(false);

  const flagUrl = getFlagUrl(teamName, size === 'lg' ? 160 : 80);
  const showFlag = flagUrl && !hasImageError;

  return (
    <span className={`team-flag team-flag-${size}`} aria-hidden="true">
      {showFlag ? (
        <img
          src={flagUrl}
          alt=""
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span className="team-flag-fallback">{getTeamInitials(teamName)}</span>
      )}
    </span>
  );
}
