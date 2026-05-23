type Props = {
  onClick: () => void;
  label?: string;
};

export function StartOverButton({ onClick, label = 'Start over' }: Props) {
  return (
    <button type="button" className="secondary" onClick={onClick}>
      {label}
    </button>
  );
}
