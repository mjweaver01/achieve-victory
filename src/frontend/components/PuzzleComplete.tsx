import type { ReactNode } from 'react';
import type { RedeemProgress } from '../utils/gameProgress';

type RedeemStatus = Exclude<RedeemProgress['status'], 'playing'>;

const SUBMITTING_MESSAGE = 'Sending your code…';

type Props = {
  status: RedeemStatus;
  message?: string;
  timeSec?: number;
  footer?: ReactNode;
};

export function PuzzleComplete({
  status,
  message = '',
  timeSec,
  footer,
}: Props) {
  const showLogo = status !== 'error';
  const body =
    status === 'submitting'
      ? message || SUBMITTING_MESSAGE
      : message;

  return (
    <div className="puzzle-complete">
      {showLogo ? (
        <img
          src="/images/logo.gif"
          alt=""
          className="puzzle-complete-logo"
          width={320}
          height={320}
        />
      ) : null}
      {timeSec != null && Number.isFinite(timeSec) ? (
        <p className="timer">Time: {timeSec.toFixed(1)}s</p>
      ) : null}
      {body ? (
        <p className={status === 'error' ? 'error' : undefined}>{body}</p>
      ) : null}
      {footer}
    </div>
  );
}
