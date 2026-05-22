import { Link } from 'react-router';
import type { ReactNode } from 'react';

export function Layout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page">
      <nav className="nav">
        <Link to="/">Play</Link>
        <Link to="/leaderboard">Leaderboard</Link>
      </nav>
      <h1>{title}</h1>
      {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      {children}
    </div>
  );
}
