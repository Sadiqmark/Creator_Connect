import React from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Mail, HelpCircle, Shield, MessageSquare, AlertCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="border-b border-border pb-8 mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            Get In Touch
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Contact CreatorSpot
          </h1>
          <p className="text-base sm:text-lg text-foreground-muted leading-relaxed max-w-2xl">
            Have a question, found a problem, or need help with your account? We're happy to hear from you.
          </p>
        </header>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* General Support Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              General Support
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              For questions about using CreatorSpot, your profile, inquiries, or account:
            </p>
            <div className="pt-2">
              <a
                href="mailto:creatorspot08@gmail.com"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
              >
                <Mail className="w-4 h-4 shrink-0" />
                creatorspot08@gmail.com
              </a>
            </div>
          </div>

          {/* Privacy & Data Requests Card */}
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card space-y-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Privacy & Data Requests
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              For questions about your personal information, account deletion, privacy, or data-related requests:
            </p>
            <div className="pt-2">
              <a
                href="mailto:creatorspot08@gmail.com"
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
              >
                <Mail className="w-4 h-4 shrink-0" />
                creatorspot08@gmail.com
              </a>
            </div>
            <p className="text-xs text-foreground-subtle pt-1">
              When contacting us about an account, please use the email address associated with your CreatorSpot account where possible.
            </p>
          </div>
        </div>

        {/* Account Issues & Feedback Details */}
        <div className="space-y-8 text-foreground text-sm sm:text-base leading-relaxed">
          <section className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-4 shadow-subtle">
            <h2 className="font-display text-xl font-bold text-foreground">
              Account Issues
            </h2>
            <p className="text-foreground-muted">
              If you're experiencing a problem with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Sign in</li>
              <li>Email verification</li>
              <li>Profile information</li>
              <li>Creator discovery</li>
              <li>Collaboration inquiries</li>
              <li>Account deactivation</li>
              <li>Account deletion</li>
            </ul>
            <p className="text-foreground-muted">
              Send us an email with a short description of the issue.
            </p>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Important:</strong> Please do not send your password or authentication codes by email.
              </span>
            </div>
          </section>

          <section className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-4 shadow-subtle">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Business & Creator Feedback
            </h2>
            <p className="text-foreground-muted">
              CreatorSpot is being developed as an India-first platform connecting businesses and creators.
            </p>
            <p className="text-foreground-muted">
              If you have suggestions or feedback about the platform:
            </p>
            <a
              href="mailto:creatorspot08@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
            >
              <Mail className="w-4 h-4 shrink-0" />
              creatorspot08@gmail.com
            </a>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
};
