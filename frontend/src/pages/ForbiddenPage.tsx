import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@creator-connect/shared';

export const ForbiddenPage: React.FC = () => {
  const { appUser } = useAuth();
  const returnPath =
    appUser?.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard';

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Access Denied (403)</h1>
        <p className="text-sm text-foreground-secondary leading-relaxed">
          You do not have permission to view or access this resource with your current account role.
        </p>
        <Link
          to={returnPath}
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Workspace
        </Link>
      </div>
    </div>
  );
};
