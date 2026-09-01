import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, ArrowRight } from 'lucide-react';

export const SessionExpiredModal: React.FC = () => {
  const navigate = useNavigate();
  const { status, clearSessionExpired } = useAuth();

  if (status !== 'SESSION_EXPIRED') return null;

  const handleLoginAgain = () => {
    clearSessionExpired();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
          <Clock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-serif text-2xl font-bold text-foreground">Session Expired</h3>
          <p className="mt-2 text-sm text-foreground-secondary leading-relaxed">
            Your authenticated session has ended for security. Please sign in again to continue your work.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoginAgain}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all cursor-pointer"
        >
          Sign In Again
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
