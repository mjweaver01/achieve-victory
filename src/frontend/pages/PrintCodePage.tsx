import { useSearchParams } from 'react-router';

const STORE_URL =
  import.meta.env.BUN_PUBLIC_STORE_URL ?? 'https://shop.madeon.com';

export function PrintCodePage() {
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const offerText = params.get('offer') ?? '';

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
        <p className="gift-card-note">One-time use at checkout</p>
        <a
          href={STORE_URL}
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
