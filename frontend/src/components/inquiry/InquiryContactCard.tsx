import React, { useState } from 'react';
import { Mail, Instagram, Youtube, Globe, Copy, Check, ExternalLink } from 'lucide-react';
import { InquiryCreatorContactDTO, InquiryBusinessContactDTO } from '../../services/api/inquiries';

interface CreatorContactCardProps {
  contact: InquiryCreatorContactDTO;
}

interface BusinessContactCardProps {
  contact: InquiryBusinessContactDTO;
}

export const CreatorContactCard: React.FC<CreatorContactCardProps> = ({ contact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    if (!contact.collaborationEmail) return;
    try {
      await navigator.clipboard.writeText(contact.collaborationEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  return (
    <div
      className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4"
      aria-labelledby="creator-contact-heading"
    >
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Direct Communication
        </span>
        <h2 id="creator-contact-heading" className="text-base font-bold text-foreground mt-0.5">
          Creator Contact
        </h2>
        <p className="text-xs text-foreground-muted mt-0.5">
          Direct collaboration channels for <span className="font-semibold text-foreground">{contact.name}</span>.
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {/* Collaboration Email */}
        {contact.collaborationEmail && (
          <div className="p-3 bg-surface-muted/50 rounded-xl border border-border/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-accent shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-foreground-subtle block">
                  Collaboration Email
                </span>
                <a
                  href={`mailto:${contact.collaborationEmail}`}
                  className="text-xs font-semibold text-foreground hover:text-accent transition-colors truncate block"
                  aria-label={`Send email to ${contact.collaborationEmail}`}
                >
                  {contact.collaborationEmail}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label={copied ? 'Email copied' : 'Copy email address'}
              title={copied ? 'Copied!' : 'Copy email'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Public Social Links */}
        {(contact.instagramUrl || contact.youtubeUrl) && (
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {contact.instagramUrl && (
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between text-xs text-foreground hover:text-accent font-semibold p-2.5 bg-surface-muted/30 hover:bg-surface-muted/70 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Instagram className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                  <span className="truncate">Instagram</span>
                </span>
                <ExternalLink className="w-3 h-3 text-foreground-subtle shrink-0" />
              </a>
            )}

            {contact.youtubeUrl && (
              <a
                href={contact.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between text-xs text-foreground hover:text-accent font-semibold p-2.5 bg-surface-muted/30 hover:bg-surface-muted/70 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Youtube className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                  <span className="truncate">YouTube</span>
                </span>
                <ExternalLink className="w-3 h-3 text-foreground-subtle shrink-0" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="pt-1 text-[11px] text-foreground-subtle">
        🔒 Shared for this accepted collaboration proposal.
      </div>
    </div>
  );
};

export const BusinessContactCard: React.FC<BusinessContactCardProps> = ({ contact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    if (!contact.collaborationEmail) return;
    try {
      await navigator.clipboard.writeText(contact.collaborationEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  return (
    <div
      className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4"
      aria-labelledby="business-contact-heading"
    >
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Direct Communication
        </span>
        <h2 id="business-contact-heading" className="text-base font-bold text-foreground mt-0.5">
          Business Contact
        </h2>
        <p className="text-xs text-foreground-muted mt-0.5">
          Direct collaboration channels for <span className="font-semibold text-foreground">{contact.businessName}</span>.
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {/* Collaboration Email */}
        {contact.collaborationEmail && (
          <div className="p-3 bg-surface-muted/50 rounded-xl border border-border/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-accent shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-semibold text-foreground-subtle block">
                  Collaboration Email
                </span>
                <a
                  href={`mailto:${contact.collaborationEmail}`}
                  className="text-xs font-semibold text-foreground hover:text-accent transition-colors truncate block"
                  aria-label={`Send email to ${contact.collaborationEmail}`}
                >
                  {contact.collaborationEmail}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground-muted hover:text-foreground transition-colors shrink-0 cursor-pointer"
              aria-label={copied ? 'Email copied' : 'Copy email address'}
              title={copied ? 'Copied!' : 'Copy email'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Public Links */}
        {(contact.websiteUrl || contact.instagramUrl) && (
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {contact.websiteUrl && (
              <a
                href={contact.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between text-xs text-foreground hover:text-accent font-semibold p-2.5 bg-surface-muted/30 hover:bg-surface-muted/70 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Globe className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                  <span className="truncate">Website</span>
                </span>
                <ExternalLink className="w-3 h-3 text-foreground-subtle shrink-0" />
              </a>
            )}

            {contact.instagramUrl && (
              <a
                href={contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between text-xs text-foreground hover:text-accent font-semibold p-2.5 bg-surface-muted/30 hover:bg-surface-muted/70 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Instagram className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                  <span className="truncate">Instagram</span>
                </span>
                <ExternalLink className="w-3 h-3 text-foreground-subtle shrink-0" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="pt-1 text-[11px] text-foreground-subtle">
        🔒 Shared for this accepted collaboration proposal.
      </div>
    </div>
  );
};
