import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, ArrowRight } from 'lucide-react';

export const SessionExpiredModal: React.FC = () => {
  const navigate = useNavigate();
  const { status, clearSessionExpired } = useAuth();

  const modalRef = useRef<HTMLDivElement>(null);
  const signInButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const isExpired = status === 'SESSION_EXPIRED';

  useEffect(() => {
    if (!isExpired) return;

    // Save previous active element for restoration if modal is closed
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Move initial focus to primary action button
    const focusTimer = setTimeout(() => {
      if (signInButtonRef.current) {
        signInButtonRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // SessionExpiredModal is intentionally blocking and non-dismissible.
      // Prevent Escape from leaking focus to the background.
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // Opener element may no longer exist in the DOM
        }
      }
    };
  }, [isExpired]);

  if (!isExpired) return null;

  const handleLoginAgain = () => {
    clearSessionExpired();
    navigate('/login');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-description"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200 outline-none"
      >
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
          <Clock className="w-7 h-7" />
        </div>
        <div>
          <h2 id="session-expired-title" className="font-serif text-2xl font-bold text-foreground">
            Session Expired
          </h2>
          <p id="session-expired-description" className="mt-2 text-sm text-foreground-secondary leading-relaxed">
            Your authenticated session has ended for security. Please sign in again to continue your work.
          </p>
        </div>
        <button
          ref={signInButtonRef}
          type="button"
          onClick={handleLoginAgain}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Sign In Again
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
