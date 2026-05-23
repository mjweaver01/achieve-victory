import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { HomePage } from './pages/HomePage';
import { PuzzlePage } from './pages/PuzzlePage';
import { ChessPage } from './pages/ChessPage';
import { SolitairePage } from './pages/SolitairePage';
import { Game2048Page } from './pages/Game2048Page';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminPage } from './pages/AdminPage';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<Navigate to="/play/puzzle" replace />} />
        <Route path="/play/puzzle" element={<PuzzlePage />} />
        <Route path="/play/chess" element={<ChessPage />} />
        <Route path="/play/solitaire" element={<SolitairePage />} />
        <Route path="/play/2048" element={<Game2048Page />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/solve" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
