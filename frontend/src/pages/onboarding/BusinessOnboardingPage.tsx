import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, ArrowRight } from 'lucide-react';

export const BusinessOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { appUser } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-center font-serif text-3xl font-bold text-foreground">
          Business Profile Setup
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-secondary">
          Role locked: <span className="font-semibold text-foreground">{appUser?.role}</span>. Register your business details and brand profile.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border sm:rounded-2xl sm:px-10 space-y-6 text-center">
          <div className="p-4 bg-background border border-border rounded-xl text-sm text-foreground-secondary leading-relaxed">
            Full Business Profile onboarding form with category selection, description, and contact info will be finalized in Phase 4.
          </div>
          <button
            onClick={() => navigate('/business/dashboard')}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all cursor-pointer"
          >
            Enter Business Workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
