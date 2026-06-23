type TimerSettingsButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function TimerSettingsButton({ isOpen, onToggle }: TimerSettingsButtonProps) {
  return (
    <button
      aria-controls="dashboard-timer-settings"
      aria-expanded={isOpen}
      aria-label="Timer settings"
      className="icon-button timer-settings-button"
      data-testid="dashboard-timer-settings-toggle"
      onClick={onToggle}
      type="button"
    >
      <span aria-hidden="true">&#9881;</span>
    </button>
  );
}
