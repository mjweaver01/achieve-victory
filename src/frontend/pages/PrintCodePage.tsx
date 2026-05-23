import { useMemo } from 'react';
import QRCode from 'react-qr-code';
import { useSearchParams } from 'react-router';

const STORE_URL =
  import.meta.env.BUN_PUBLIC_STORE_URL ?? 'https://shop.madeon.com';

function discountUrl(storeUrl: string, code: string): string {
  const base = storeUrl.replace(/\/$/, '');
  return `${base}/discount/${encodeURIComponent(code)}`;
}

export function PrintCodePage() {
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const offerText = params.get('offer') ?? '';
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
          width={160}
          height={160}
        />
        <p className="gift-card-label">Madeon discount</p>
        <p className="gift-card-code">{code}</p>
        {offerText ? <p className="gift-card-offer">{offerText}</p> : null}
        <div className="gift-card-qr">
          <QRCode
            value={checkoutUrl}
            size={128}
            level="M"
            fgColor="#111111"
            bgColor="#ffffff"
            title={`Redeem code ${code} at checkout`}
          />
        </div>
        <p className="gift-card-qr-hint">Scan to apply at checkout</p>
        <p className="gift-card-note">One-time use</p>
        <a
          href={checkoutUrl}
          className="gift-card-store print-hide"
          target="_blank"
          rel="noopener noreferrer"
        >
          Shop now
        </a>
      </div>
      <button
        type="button"
        className="secondary print-hide print-page-button"
        onClick={handlePrint}
      >
        Print
      </button>
    </div>
  );
}
