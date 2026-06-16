import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function PinLogin({ onLogin }) {
  const [playerName, setPlayerName] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedPlayerName = playerName.trim();
    const normalizedPin = pin.trim();

    if (!normalizedPlayerName || !normalizedPin) {
      setErrorMessage('Usuario o PIN inválido');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const { data: player, error } = await supabase
      .from('players')
      .select('id, name, pin')
      .ilike('name', normalizedPlayerName)
      .eq('pin', normalizedPin)
      .maybeSingle();

    setIsLoading(false);

    if (error || !player) {
      setErrorMessage('Usuario o PIN inválido');
      return;
    }

    onLogin(player);
  }

  return (
    <section className="login-panel">
      <div className="brand-block">
        <span className="brand-mark">PM</span>
        <div>
          <p className="eyebrow">Pronósticos de fútbol</p>
          <h1>Polla de partidos</h1>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="player-name">Usuario</label>
        <input
          id="player-name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Ej: Carlos"
          autoComplete="username"
        />

        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="Ej: 1111"
          autoComplete="off"
        />

        {errorMessage ? <p className="message message-error">{errorMessage}</p> : null}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Validando...' : 'Entrar'}
        </button>
      </form>
    </section>
  );
}
