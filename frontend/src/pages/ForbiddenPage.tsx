import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@creator-connect/shared';

export const ForbiddenPage: React.FC = () => {
  const { appUser } = useAuth();

  const returnPath = !appUser
    ? '/login'
    : appUser.role === UserRole.CREATOR
    ? '/creator/dashboard'
    : '/business/dashboard';

  const returnLabel = !appUser ? 'Sign In' : 'Return to Workspace';

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">Access Denied (403)</h1>
        <p className="text-sm text-foreground-muted leading-relaxed">
          You do not have permission to view or access this resource with your current account role.
        </p>
        <Link
          to={returnPath}
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl shadow-subtle text-sm font-semibold text-white bg-accent hover:bg-accent-hover transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {returnLabel}
        </Link>
      </div>
    </div>
  );
};
