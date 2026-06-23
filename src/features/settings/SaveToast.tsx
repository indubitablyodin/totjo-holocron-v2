import { useEffect, useState } from 'react';

export function useSaveToast() {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowToast(false);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showToast]);

  return {
    showToast,
    trigger: () => {
      setShowToast(true);
    },
  };
}

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
