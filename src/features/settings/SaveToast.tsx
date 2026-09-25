export function SaveToast({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="save-toast" role="status">
      Saved
    </div>
  );
}
