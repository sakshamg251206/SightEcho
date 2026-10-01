export function ProgressBar({ value, label }: { value: number | undefined; label: string }) {
  const percent = value === undefined ? undefined : Math.round(value * 100);
  return (
    <div
      className={`progress${percent === undefined ? ' progress--indeterminate' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="progress__fill"
        style={{ width: percent === undefined ? undefined : `${percent}%` }}
      />
    </div>
  );
}
