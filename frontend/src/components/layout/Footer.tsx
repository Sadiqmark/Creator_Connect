import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      role="contentinfo"
      aria-label="CreatorSpot Public Footer"
      className="bg-surface border-t border-border mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Mission Column */}
          <div className="md:col-span-2 space-y-4">
            <Link
              to="/creators"
              className="inline-flex items-center gap-2 text-foreground hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
              aria-label="CreatorSpot Home"
            >
              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-subtle shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                CreatorSpot
              </span>
            </Link>
            <p className="text-sm text-foreground-muted leading-relaxed max-w-sm">
              The structured collaboration platform connecting Businesses and Creators across India.
            </p>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm" role="list">
              <li>
                <Link
                  to="/creators"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Explore Creators
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  About CreatorSpot
                </Link>
              </li>
            </ul>
          </div>

          {/* Creators & Businesses */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              For Creators
            </h3>
            <ul className="space-y-2.5 text-sm" role="list">
              <li>
                <Link
                  to="/signup"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Join as Creator
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Creator Login
                </Link>
              </li>
            </ul>

            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground pt-3">
              For Businesses
            </h3>
            <ul className="space-y-2.5 text-sm" role="list">
              <li>
                <Link
                  to="/creators"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Discover Creators
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Business Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Legal & Support
            </h3>
            <ul className="space-y-2.5 text-sm" role="list">
              <li>
                <Link
                  to="/privacy"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-foreground-muted">
          <p>© 2026 CreatorSpot. All rights reserved.</p>
          <p className="font-medium text-foreground-subtle">Independently operated.</p>
        </div>
      </div>
    </footer>
  );
};
