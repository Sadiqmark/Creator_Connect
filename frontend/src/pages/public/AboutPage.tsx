import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Users, Search, ArrowRight, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="border-b border-border pb-8 mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            Our Purpose
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            About CreatorSpot
          </h1>
          <p className="text-base sm:text-lg text-foreground-muted leading-relaxed max-w-2xl">
            A structured discovery and collaboration platform connecting businesses and creators across India.
          </p>
        </header>

        {/* Narrative Section */}
        <article className="space-y-10 text-foreground text-sm sm:text-base leading-relaxed">
          <section className="bg-surface rounded-2xl border border-border p-6 sm:p-10 shadow-card space-y-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Connecting India's Creative Economy
            </h2>
            <p className="text-base sm:text-lg text-foreground-muted leading-relaxed">
              CreatorSpot is a structured discovery and collaboration platform connecting businesses and creators across India.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="p-5 rounded-xl bg-surface-muted/60 border border-border space-y-3">
                <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-subtle">
                  <Search className="w-4 h-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  For Businesses
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  Businesses can discover creators, evaluate their public profiles, and send structured collaboration inquiries with clearly defined deliverables and timelines.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-surface-muted/60 border border-border space-y-3">
                <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shadow-subtle">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  For Creators
                </h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  Creators can showcase their work, review structured opportunities from brands, and decide which inquiries they want to accept on their own terms.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-surface rounded-2xl border border-border p-6 sm:p-10 shadow-card space-y-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Our Core Focus
            </h2>
            <p className="text-foreground leading-relaxed">
              CreatorSpot focuses on the connection between businesses and creators.
            </p>
            <p className="text-foreground-muted leading-relaxed">
              Once a collaboration is accepted, the parties can communicate and manage the actual collaboration externally.
            </p>
            <div className="p-5 rounded-xl bg-surface-muted/60 border border-border flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Streamlined & Uncluttered
                </h3>
                <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
                  CreatorSpot does not process payments, manage campaigns, handle contracts, or provide in-app messaging. We provide a focused, trustworthy venue for introduction, discovery, and controlled contact exchange.
                </p>
              </div>
            </div>
          </section>

          {/* Quick CTAs */}
          <section className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/creators"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-surface text-sm font-bold hover:bg-foreground/90 transition-colors shadow-subtle"
            >
              Explore Creators <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-surface text-foreground text-sm font-bold hover:bg-surface-muted transition-colors shadow-subtle"
            >
              How It Works
            </Link>
          </section>
        </article>
      </div>
    </PublicLayout>
  );
};
