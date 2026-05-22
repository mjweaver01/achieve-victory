type Props = {
  onClick: () => void;
  disabled?: boolean;
  notice?: string;
};

export function ResendCodeButton({ onClick, disabled, notice }: Props) {
  return (
    <div className="resend-code">
      <button
        type="button"
        className="secondary"
        onClick={onClick}
        disabled={disabled}
      >
        {disabled ? 'Sending…' : 'Resend code'}
      </button>
      {notice ? <p className="resend-code-notice">{notice}</p> : null}
    </div>
  );
}
