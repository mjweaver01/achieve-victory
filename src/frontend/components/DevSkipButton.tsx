type Props = {
  onClick: () => void;
  disabled?: boolean;
};

function isLocalDevHost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function DevSkipButton({ onClick, disabled }: Props) {
  if (!isLocalDevHost()) return null;
  return (
    <div className="dev-skip">
      <button
        type="button"
        className="secondary"
        onClick={onClick}
        disabled={disabled}
      >
        {disabled ? 'Skipping…' : 'Dev: skip to code'}
      </button>
    </div>
  );
}
