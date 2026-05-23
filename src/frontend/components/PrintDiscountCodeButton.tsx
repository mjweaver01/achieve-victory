type Props = {
  code: string;
  offerText: string;
};

export function PrintDiscountCodeButton({ code, offerText }: Props) {
  const handlePrint = () => {
    const params = new URLSearchParams({
      code,
      offer: offerText,
    });
    window.open(`/print?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="print-code-action">
      <button type="button" className="secondary" onClick={handlePrint}>
        Print discount code
      </button>
    </div>
  );
}
