import { useMemo } from 'react';
import { QRCode } from 'react-qr-code';
import { Link, useSearchParams } from 'react-router';
import { STORE_URL } from '../../constants/store';
import { gamePath, getStoredSession } from '../utils/session';

function discountUrl(storeUrl: string, code: string): string {
  const base = storeUrl.replace(/\/$/, '');
  return `${base}/discount/${encodeURIComponent(code)}`;
}

export function PrintCodePage() {
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const offerText = params.get('offer') ?? '';
  const backTo = useMemo(() => {
    const session = getStoredSession();
    return session ? gamePath(session.game) : '/';
  }, []);
  const checkoutUrl = useMemo(
    () => (code ? discountUrl(STORE_URL, code) : ''),
    [code]
  );

  const handlePrint = () => {
    window.print();
  };

  if (!code) {
    return (
      <div className="print-page">
        <p className="print-page-empty">No discount code to print.</p>
      </div>
    );
  }

  return (
    <div className="print-page">
      <div className="gift-card">
        <img
          src="/images/logo.gif"
          alt=""
          className="gift-card-logo"
          width={250}
          height={250}
        />
        <p className="gift-card-label">Madeon discount</p>
        <p className="gift-card-code">{code}</p>
        {offerText ? <p className="gift-card-offer">{offerText}</p> : null}
        <div className="gift-card-qr">
          <QRCode
            value={checkoutUrl}
            size={128}
            level="M"
            fgColor="var(--qr-fg)"
            bgColor="var(--qr-bg)"
            title={`Redeem code ${code} at checkout`}
          />
        </div>
        <p className="gift-card-qr-hint">Scan to apply at checkout</p>
        <p className="gift-card-note">One-time use</p>
        <div className="gift-card-footer print-hide">
          <div className="gift-card-actions">
            <button type="button" className="secondary" onClick={handlePrint}>
              Print
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => window.open(checkoutUrl, '_blank')}
            >
              Shop now
            </button>
          </div>
          <Link to={backTo} className="gift-card-back">
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
