import { useEffect, useState } from 'react';

/**
 * BackToTopButton - Floating button that appears when user scrolls down
 * and scrolls the page back to top when clicked.
 */
export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled past viewport height
      setIsVisible(window.scrollY > window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ behavior: 'smooth', top: 0, left: 0 });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      aria-label="Scroll to top"
      className="back-to-top-button"
      data-testid="back-to-top-button"
      onClick={scrollToTop}
      type="button"
    >
      <span aria-hidden="true" className="back-to-top-button__icon" data-icon="↑" />
      <span className="back-to-top-button__label">Top</span>
    </button>
  );
}
