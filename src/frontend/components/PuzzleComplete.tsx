import type { ReactNode } from 'react';
import type { RedeemProgress } from '../utils/gameProgress';
import { formatDuration } from '../utils/time';

type RedeemStatus = Exclude<RedeemProgress['status'], 'playing'>;

const SUBMITTING_MESSAGE = 'Generating your code…';

type Props = {
  status: RedeemStatus;
  message?: string;
  code?: string;
  offerText?: string;
  timeMs?: number;
  footer?: ReactNode;
};

export function PuzzleComplete({
  status,
  message = '',
  code = '',
  offerText = '',
  timeMs,
  footer,
}: Props) {
  const body =
    status === 'submitting' ? message || SUBMITTING_MESSAGE : message;

  return (
    <div className="puzzle-complete">
      <img
        src="/images/logo.gif"
        alt=""
        className="puzzle-complete-logo"
        width={320}
        height={320}
      />
      {timeMs != null && Number.isFinite(timeMs) ? (
        <p className="timer">Time: {formatDuration(timeMs)}</p>
      ) : null}
      {body ? (
        <p className={status === 'error' ? 'error' : undefined}>{body}</p>
      ) : null}
      {status !== 'submitting' && code ? (
        <>
          <h2 className="reward-code">{code}</h2>
          {offerText ? <p className="reward-offer">{offerText}</p> : null}
        </>
      ) : null}
      {footer}
    </div>
  );
}
