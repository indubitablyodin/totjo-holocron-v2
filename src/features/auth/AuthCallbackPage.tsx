import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PageLayout, PageSection } from '@/app/pagePrimitives';
import { AuthCallbackError } from '@/features/auth/authClient';
import { useAuth } from '@/features/auth/AuthContext';

export function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { consumeCallback, signOut } = useAuth();
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }

    hasHandledCallback.current = true;

    const completeCallback = async () => {
      const callbackUrl = new URL(`${window.location.origin}${location.pathname}${location.search}`);

      try {
        await consumeCallback(callbackUrl);
        navigate('/settings/account', { replace: true });
      } catch (error) {
        await signOut();
        const authErrorCode = error instanceof AuthCallbackError ? error.code : 'invalid-or-expired-link';
        navigate(`/settings/account?auth-error=${authErrorCode}`, { replace: true });
      }
    };

    void completeCallback();
  }, [consumeCallback, location.pathname, location.search, navigate, signOut]);

  return (
    <PageLayout
      description="Signing you in now. If the link does not work, you will go back to your account settings with a clear message."
      eyebrow="Account"
      title="Signing you in"
    >
      <PageSection description="You can keep reading even if sign-in does not finish." title="One moment">
        <p className="support-copy">Finishing your sign-in and returning you to account settings…</p>
      </PageSection>
    </PageLayout>
  );
}
