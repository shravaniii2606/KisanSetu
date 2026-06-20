export default function AppTour({ onRestart, className = '' }) {
  return (
    <button type="button" className={`tour-again-button ${className}`.trim()} onClick={onRestart}>
      Take a Tour
    </button>
  );
}
