import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '@creator-connect/shared';
import { Sparkles, Menu, X } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { appUser } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Explore Creators', href: '/creators' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const dashboardRoute =
    appUser?.role === UserRole.CREATOR ? '/creator/dashboard' : '/business/dashboard';

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-30 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link
          to="/creators"
          className="flex items-center gap-2 text-foreground hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
          aria-label="CreatorSpot Home"
        >
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-white shadow-subtle shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            CreatorSpot
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm ${
                  isActive
                    ? 'text-accent font-bold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          {appUser ? (
            <Link
              to={dashboardRoute}
              className="px-4 py-2 bg-foreground text-surface rounded-xl text-xs font-bold hover:bg-foreground/90 transition-colors shadow-subtle focus:outline-none focus:ring-2 focus:ring-accent"
            >
              My Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-sm"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors shadow-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              >
                Join as Creator
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-foreground hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-6 space-y-4 shadow-card">
          <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm py-2 px-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent font-bold'
                      : 'text-foreground font-semibold hover:bg-surface-muted'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-border flex flex-col gap-2">
            {appUser ? (
              <Link
                to={dashboardRoute}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-foreground text-surface rounded-xl text-xs font-bold hover:bg-foreground/90 transition-colors"
              >
                My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 border border-border text-foreground rounded-xl text-xs font-semibold hover:bg-surface-muted transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-accent text-white rounded-xl text-xs font-bold hover:bg-accent-hover transition-colors shadow-subtle"
                >
                  Join as Creator
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
