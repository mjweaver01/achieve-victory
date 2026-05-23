import type { ReactNode } from 'react';

type ToolbarButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  'aria-label'?: string;
};

export function GameToolbarButton({
  onClick,
  disabled,
  children,
  'aria-label': ariaLabel,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className="game-toolbar-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function isLocalDevHost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

type Props = {
  onStartOver: () => void;
  onDevSkip?: () => void;
  devSkipBusy?: boolean;
  children?: ReactNode;
};

export function GameToolbar({
  onStartOver,
  onDevSkip,
  devSkipBusy,
  children,
}: Props) {
  return (
    <div className="game-toolbar">
      {children}
      <GameToolbarButton onClick={onStartOver}>Start over</GameToolbarButton>
      {onDevSkip && isLocalDevHost() ? (
        <GameToolbarButton onClick={onDevSkip} disabled={devSkipBusy}>
          {devSkipBusy ? 'Skipping…' : 'Dev: skip to code'}
        </GameToolbarButton>
      ) : null}
    </div>
  );
}
