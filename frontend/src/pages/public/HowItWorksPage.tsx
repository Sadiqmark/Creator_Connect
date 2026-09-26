import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import {
  Search,
  Eye,
  Send,
  Clock,
  MailCheck,
  ExternalLink,
  UserCheck,
  Sparkles,
  Inbox,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'business' | 'creator'>('business');

  const businessSteps = [
    {
      num: 1,
      title: 'Discover creators',
      desc: 'Explore creators based on their niche, location, specialties, and public profile information.',
      icon: Search,
    },
    {
      num: 2,
      title: 'Evaluate profiles',
      desc: "Review the creator's profile and public social links.",
      icon: Eye,
    },
    {
      num: 3,
      title: 'Send an inquiry',
      desc: 'Submit a structured collaboration inquiry describing the opportunity, platform, deliverables, timeline, and requirements.',
      icon: Send,
    },
    {
      num: 4,
      title: 'Wait for a response',
      desc: 'The creator can review the inquiry and decide whether to accept or reject it.',
      icon: Clock,
    },
    {
      num: 5,
      title: 'Connect',
      desc: 'When an inquiry is accepted, CreatorSpot enables controlled exchange of the collaboration contact information between the two participants.',
      icon: MailCheck,
    },
    {
      num: 6,
      title: 'Collaborate externally',
      desc: 'The actual collaboration, contracts, payments, deliverables, and communication happen outside CreatorSpot.',
      icon: ExternalLink,
    },
  ];

  const creatorSteps = [
    {
      num: 1,
      title: 'Create your profile',
      desc: 'Showcase your niche, specialties, location, bio, and social profiles.',
      icon: UserCheck,
    },
    {
      num: 2,
      title: 'Get discovered',
      desc: 'Businesses can discover your public CreatorSpot profile.',
      icon: Sparkles,
    },
    {
      num: 3,
      title: 'Review inquiries',
      desc: 'Receive structured collaboration opportunities from businesses.',
      icon: Inbox,
    },
    {
      num: 4,
      title: 'Choose what to accept',
      desc: 'You decide whether to accept or reject each inquiry.',
      icon: CheckCircle2,
    },
    {
      num: 5,
      title: 'Connect',
      desc: 'After accepting an inquiry, the relevant collaboration contact information becomes available to the participants.',
      icon: MailCheck,
    },
    {
      num: 6,
      title: 'Collaborate externally',
      desc: 'Continue the collaboration outside CreatorSpot.',
      icon: ExternalLink,
    },
  ];

  const currentSteps = activeTab === 'business' ? businessSteps : creatorSteps;

  return (
    <PublicLayout>
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="border-b border-border pb-8 mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            Simple 6-Step Flow
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            How CreatorSpot Works
          </h1>
          <p className="text-base sm:text-lg text-foreground-muted leading-relaxed max-w-2xl">
            A clear, structured pathway connecting Indian businesses and digital creators without intermediary friction.
          </p>
        </header>

        {/* Role Switcher Tabs */}
        <div className="flex items-center gap-3 p-1.5 bg-surface-muted rounded-2xl border border-border max-w-md mb-10">
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'business'
                ? 'bg-surface text-foreground shadow-subtle'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            For Businesses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('creator')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'creator'
                ? 'bg-surface text-foreground shadow-subtle'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            For Creators
          </button>
        </div>

        {/* Steps List */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-foreground">
            {activeTab === 'business' ? 'FOR BUSINESSES' : 'FOR CREATORS'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {currentSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-surface rounded-2xl border border-border p-6 shadow-card space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-accent/10 text-accent font-bold text-xs flex items-center justify-center">
                        {step.num}
                      </span>
                      <Icon className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-foreground-muted leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/creators"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-surface text-sm font-bold hover:bg-foreground/90 transition-colors shadow-subtle"
          >
            Explore Creators <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-surface text-foreground text-sm font-bold hover:bg-surface-muted transition-colors shadow-subtle"
          >
            Join CreatorSpot
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
};
