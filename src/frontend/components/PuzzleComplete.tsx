import type { ReactNode } from 'react';
import type { RedeemProgress } from '../utils/gameProgress';
import { formatDuration } from '../utils/time';

type RedeemStatus = Exclude<RedeemProgress['status'], 'playing'>;

const SUBMITTING_MESSAGE = 'Sending your code…';

type Props = {
  status: RedeemStatus;
  message?: string;
  timeMs?: number;
  footer?: ReactNode;
};

export function PuzzleComplete({
  status,
  message = '',
  timeMs,
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
      {timeMs != null && Number.isFinite(timeMs) ? (
        <p className="timer">Time: {formatDuration(timeMs)}</p>
      ) : null}
      {body ? (
        <p className={status === 'error' ? 'error' : undefined}>{body}</p>
      ) : null}
      {footer}
    </div>
  );
}
