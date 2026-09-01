import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Page Not Found (404)</h1>
        <p className="text-sm text-foreground-secondary leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl shadow-sm text-sm font-bold text-white bg-accent hover:bg-accent-hover transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};
