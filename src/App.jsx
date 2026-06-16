import { useState } from 'react';
import PinLogin from './components/PinLogin.jsx';
import PredictionsPage from './components/PredictionsPage.jsx';

export default function App() {
  const [currentPlayer, setCurrentPlayer] = useState(null);

  return (
    <main className="app-shell">
      {currentPlayer ? (
        <PredictionsPage
          player={currentPlayer}
          onLogout={() => setCurrentPlayer(null)}
        />
      ) : (
        <PinLogin onLogin={setCurrentPlayer} />
      )}
    </main>
  );
}
