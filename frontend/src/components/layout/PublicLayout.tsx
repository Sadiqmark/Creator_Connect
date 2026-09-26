import React from 'react';
import { PublicHeader } from './PublicHeader';
import { Footer } from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-accent selection:text-white">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};
