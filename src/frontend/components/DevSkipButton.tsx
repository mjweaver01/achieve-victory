import { getDevAdminSecret, isLocalDevHost } from '../utils/devAdmin';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
};

export function DevSkipButton({ onClick, disabled, hint }: Props) {
  if (!isLocalDevHost()) return null;

  const hasSecret = Boolean(getDevAdminSecret());

  return (
    <div className="dev-skip">
      <button
        type="button"
        className="secondary"
        onClick={onClick}
        disabled={disabled || !hasSecret}
      >
        {disabled ? 'Skipping…' : 'Dev: skip to code'}
      </button>
      {!hasSecret ? (
        <p className="dev-skip-hint">
          {hint ??
            'Open /solve?key=YOUR_ADMIN_SECRET once to enable (same value as ADMIN_SECRET in .env).'}
        </p>
      ) : null}
    </div>
  );
}
