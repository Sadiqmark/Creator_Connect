import React from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Page Header */}
        <header className="border-b border-border pb-8 mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            Legal Documentation
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-foreground-muted">
            Effective Date: <span className="font-semibold text-foreground">October 8, 2026</span>
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-neutral max-w-none space-y-10 text-foreground text-sm sm:text-base leading-relaxed">
          <p className="text-base sm:text-lg text-foreground leading-relaxed">
            CreatorSpot is an independently operated online platform that connects businesses and creators for discovery and structured collaboration inquiries.
          </p>
          <p>
            This Privacy Policy explains what personal information CreatorSpot collects, how it is used, how it is protected, when it is shared, and what choices are available to you.
          </p>
          <p>
            By using CreatorSpot, you acknowledge the practices described in this Privacy Policy.
          </p>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              1. Who operates CreatorSpot?
            </h2>
            <p>
              CreatorSpot is currently an independently operated personal project and is not operated through a separately registered company or corporate entity.
            </p>
            <p>
              For privacy and support-related questions:
            </p>
            <div className="bg-surface p-4 rounded-xl border border-border">
              <p className="font-medium">
                Email:{' '}
                <a
                  href="mailto:creatorspot08@gmail.com"
                  className="text-accent hover:underline font-semibold"
                >
                  creatorspot08@gmail.com
                </a>
              </p>
            </div>
            <p>
              CreatorSpot is currently intended primarily for users in India.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              2. Information We Collect
            </h2>
            <p>
              We collect information that is necessary to create accounts, operate profiles, facilitate collaboration inquiries, maintain platform security, and provide the CreatorSpot service.
            </p>
            <h3 className="font-display text-lg font-bold text-foreground pt-2">
              2.1 Account information
            </h3>
            <p>When you create an account, we may process:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Email address</li>
              <li>Firebase authentication identifier</li>
              <li>Email-verification status</li>
              <li>Account role, such as Creator or Business</li>
              <li>Account creation and update timestamps</li>
              <li>Account lifecycle information such as active, deactivated, or deleted status</li>
            </ul>
            <p>
              Your authentication credentials are handled by Firebase Authentication. CreatorSpot's application database does not store your account password.
            </p>
            <p>
              Firebase Authentication is used to provide account authentication, email verification, password reset, and identity management.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              3. Creator Profile Information
            </h2>
            <p>If you create a Creator profile, you may provide:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Name</li>
              <li>Profile photograph</li>
              <li>Creator niche</li>
              <li>Location</li>
              <li>Biography</li>
              <li>Content specialties</li>
              <li>Instagram profile URL</li>
              <li>YouTube channel URL</li>
              <li>Collaboration email address</li>
            </ul>
            <p>
              Information intended for your public profile may be displayed to other users and visitors of CreatorSpot.
            </p>
            <p className="font-medium text-foreground">
              Your collaboration email address is private and is not displayed on your public profile.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              4. Business Profile Information
            </h2>
            <p>If you create a Business profile, you may provide:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Business or brand name</li>
              <li>Business category</li>
              <li>Business description</li>
              <li>City</li>
              <li>State or province</li>
              <li>Country</li>
              <li>Business logo</li>
              <li>Website URL</li>
              <li>Instagram profile URL</li>
              <li>Collaboration email address</li>
            </ul>
            <p>
              Information intended for your public business profile may be displayed to other users.
            </p>
            <p className="font-medium text-foreground">
              Your collaboration email address is private and is not displayed publicly.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              5. Collaboration Inquiry Information
            </h2>
            <p>
              When a Business sends an inquiry to a Creator, CreatorSpot processes information contained in that inquiry, which may include:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Business and Creator identifiers</li>
              <li>Inquiry status</li>
              <li>Collaboration type</li>
              <li>Target social platform</li>
              <li>Proposed deliverables</li>
              <li>Proposed timeline</li>
              <li>Collaboration brief</li>
              <li>Additional requirements or notes</li>
              <li>Inquiry creation, response, expiration, and closure timestamps</li>
            </ul>
            <p>
              This information is used to allow the recipient to understand and respond to a proposed collaboration.
            </p>
            <p className="font-semibold text-foreground">
              An unanswered inquiry currently expires automatically after 60 days.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              6. Saved Creators
            </h2>
            <p>
              A Business may save a Creator for later reference.
            </p>
            <p>
              When this feature is used, CreatorSpot stores the relationship between the Business and Creator and the date on which the Creator was saved.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              7. Notifications
            </h2>
            <p>
              CreatorSpot maintains notifications associated with activity on your account. These may include notifications relating to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>New inquiries</li>
              <li>Accepted inquiries</li>
              <li>Rejected inquiries</li>
              <li>Expired inquiries</li>
              <li>Collaboration email updates</li>
            </ul>
            <p>
              We store notification status, such as whether a notification has been read.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              8. Security and Audit Information
            </h2>
            <p>
              CreatorSpot maintains internal audit records for certain important account and collaboration events. These records may include:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Event type</li>
              <li>User identifier</li>
              <li>Resource identifier</li>
              <li>Relevant metadata</li>
              <li>Event timestamp</li>
            </ul>
            <p>
              Audit records are used for security, reliability, troubleshooting, and maintaining an accurate history of important system events.
            </p>
            <p>
              These audit records are internal and are not exposed through the normal user-facing application.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              9. How We Use Your Information
            </h2>
            <p>CreatorSpot uses information for purposes including:</p>

            <h3 className="font-display text-base font-bold text-foreground pt-1">
              Providing the service:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Create and maintain accounts</li>
              <li>Authenticate users</li>
              <li>Display creator and business profiles</li>
              <li>Allow businesses to discover creators</li>
              <li>Allow creators to evaluate businesses</li>
              <li>Send and receive structured collaboration inquiries</li>
              <li>Track inquiry status</li>
              <li>Provide notifications</li>
              <li>Facilitate controlled contact exchange</li>
            </ul>

            <h3 className="font-display text-base font-bold text-foreground pt-2">
              Account management:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Verify email addresses</li>
              <li>Support password recovery</li>
              <li>Manage account activation and deactivation</li>
              <li>Process account deletion</li>
              <li>Maintain account security</li>
            </ul>

            <h3 className="font-display text-base font-bold text-foreground pt-2">
              Security and reliability:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Detect misuse</li>
              <li>Prevent unauthorized access</li>
              <li>Protect users</li>
              <li>Maintain application integrity</li>
              <li>Investigate security or operational issues</li>
              <li>Maintain internal audit records</li>
            </ul>

            <h3 className="font-display text-base font-bold text-foreground pt-2">
              Legal and regulatory purposes:
            </h3>
            <p>
              We may retain or process information where reasonably necessary to comply with applicable law, respond to lawful requests, protect rights, or address security or fraud-related issues.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              10. Collaboration Email Privacy
            </h2>
            <p>
              CreatorSpot treats collaboration email addresses as private information.
            </p>
            <p>A collaboration email:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Is not displayed on public discovery pages.</li>
              <li>Is not displayed on public creator profiles.</li>
              <li>Is not displayed on public business profiles.</li>
              <li>Is not searchable through public profile discovery.</li>
              <li>Is not sold or provided to unrelated third parties for marketing.</li>
            </ul>
            <p>
              For an inquiry that has not been accepted, the participants cannot use CreatorSpot's contact functionality to retrieve each other's collaboration email.
            </p>
            <p>
              When an inquiry is accepted, the Creator and Business involved in that specific inquiry may access each other's collaboration email through CreatorSpot.
            </p>
            <p className="font-medium text-foreground">
              This access is limited to the participants of the accepted inquiry.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              11. Third-Party Services
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Firebase Authentication</h3>
                <p className="text-foreground-muted mt-1">
                  CreatorSpot uses Firebase Authentication, provided by Google, for account authentication, email verification, password reset, and authentication session management. Authentication information is processed by Firebase's infrastructure. CreatorSpot does not store user passwords in its application database.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-foreground">Cloudinary</h3>
                <p className="text-foreground-muted mt-1">
                  CreatorSpot uses Cloudinary for profile photographs and business logos. Images are uploaded using signed uploads. CreatorSpot's backend generates the required upload signature, while the image itself may be uploaded directly from the browser to Cloudinary. The Cloudinary API secret is not exposed to the browser.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-foreground">PostgreSQL</h3>
                <p className="text-foreground-muted mt-1">
                  CreatorSpot uses PostgreSQL as its application database. Application information such as profiles, inquiries, notifications, and account lifecycle information is stored in the application's backend database. The PostgreSQL database is not directly exposed to users' browsers.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-foreground">Google Fonts</h3>
                <p className="text-foreground-muted mt-1">
                  CreatorSpot currently uses Google Fonts for website typography. When your browser loads these fonts, your browser communicates with Google's font infrastructure. This may involve technical information such as your IP address and browser/user-agent information as part of the request.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-foreground">Email delivery & Payment processing</h3>
                <p className="text-foreground-muted mt-1">
                  Account verification and password-reset emails are handled through Firebase Authentication infrastructure. CreatorSpot does not currently integrate separate email delivery providers such as SendGrid, Mailgun, or Resend. CreatorSpot does not currently connect payment gateways such as Stripe or Razorpay.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              12. Cookies and Browser Storage
            </h2>
            <p>
              CreatorSpot does not currently use advertising, analytics, or marketing cookies.
            </p>
            <p>
              The application does not intentionally set or read custom cookies through <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded border border-border">document.cookie</code>.
            </p>
            <p>
              The application also does not intentionally use <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded border border-border">localStorage</code> or <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded border border-border">sessionStorage</code> for application data.
            </p>
            <p>
              However, Firebase Authentication may use browser-managed storage, including IndexedDB or browser local storage, to maintain your authentication session across page reloads. This storage is used for authentication functionality rather than advertising or behavioral tracking.
            </p>
            <p>CreatorSpot currently does not use:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Google Analytics</li>
              <li>Google Tag Manager</li>
              <li>Meta Pixel</li>
              <li>Mixpanel</li>
              <li>PostHog</li>
              <li>Amplitude</li>
              <li>Hotjar</li>
              <li>FullStory</li>
              <li>Client-side Sentry telemetry</li>
            </ul>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              13. How We Protect Information
            </h2>
            <p>
              CreatorSpot uses technical and organizational measures designed to protect application information. These include measures such as:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Authentication through Firebase</li>
              <li>Server-side authorization</li>
              <li>Role-based access controls</li>
              <li>Resource-level access checks</li>
              <li>Private contact-information endpoints</li>
              <li>Signed Cloudinary uploads</li>
              <li>Backend-only database access</li>
              <li>Database constraints</li>
              <li>Security audit events</li>
              <li>Rate limiting</li>
              <li>Controlled account lifecycle processing</li>
            </ul>
            <p>
              However, no internet service can guarantee absolute security. You should use a strong, unique password for your authentication account and protect access to the email account associated with your CreatorSpot account.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              14. Account Deactivation
            </h2>
            <p>
              You may deactivate your CreatorSpot account through the account settings functionality available to you.
            </p>
            <p>When an account is deactivated:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>The account is removed from public discovery.</li>
              <li>The public profile is no longer available for normal discovery.</li>
              <li>Your account data is retained during the applicable reactivation period.</li>
              <li>You may reactivate your account during the applicable grace period.</li>
            </ul>
            <p className="font-semibold text-foreground">
              The current product lifecycle provides a 30-day period following deactivation before permanent deletion processing.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              15. Permanent Account Deletion
            </h2>
            <p>
              If an account remains deactivated through the 30-day grace period, CreatorSpot may permanently delete or anonymize the account according to its account-lifecycle process.
            </p>
            <p>Depending on the account type, this may include:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Removing personal collaboration contact information</li>
              <li>Anonymizing the profile's displayed identity</li>
              <li>Removing the account's active authentication identity</li>
              <li>Retaining limited historical records where necessary for legitimate operational, security, legal, or historical purposes</li>
            </ul>
            <p>
              Historical inquiry records may remain so that the integrity of previously recorded platform activity can be maintained, while deleted users are no longer presented as active users.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              16. Email Address Reservation After Deletion
            </h2>
            <p>
              Following permanent account deletion, CreatorSpot may retain a cryptographic representation of the previously used email address for a limited period.
            </p>
            <p className="font-semibold text-foreground">
              The current system uses a SHA-256 hash of the normalized email address and reserves the corresponding identifier for 180 days.
            </p>
            <p>
              This mechanism is used to prevent immediate account recycling and certain forms of account abuse. The original email address is not retained in this reservation as plain text. After the applicable reservation period, the reservation may expire.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              17. Inquiry Retention
            </h2>
            <p>
              CreatorSpot maintains inquiry information as part of the platform's collaboration history and operational records.
            </p>
            <p className="font-semibold text-foreground">
              An unanswered inquiry currently expires automatically after 60 days.
            </p>
            <p>
              Other inquiry statuses, including accepted, rejected, expired, and closed inquiries, may remain in the system according to the application's retention and account-lifecycle rules. Permanent account deletion may close active relationships and anonymize the associated user identity while preserving limited historical records.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              18. Your Choices and Requests
            </h2>
            <p>
              Depending on applicable law, you may have rights relating to your personal information, including rights concerning access, correction, updating, deletion, withdrawal of consent where applicable, and raising complaints.
            </p>
            <p>CreatorSpot provides account-management functionality for actions such as:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Updating profile information</li>
              <li>Deactivating your account</li>
              <li>Requesting permanent account deletion</li>
            </ul>
            <p>For privacy-related requests or questions:</p>
            <div className="bg-surface p-4 rounded-xl border border-border">
              <p className="font-medium">
                Email:{' '}
                <a
                  href="mailto:creatorspot08@gmail.com"
                  className="text-accent hover:underline font-semibold"
                >
                  creatorspot08@gmail.com
                </a>
              </p>
            </div>
            <p className="text-xs text-foreground-muted">
              Please use the email address associated with your CreatorSpot account where appropriate so that we can reasonably verify the request.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              19. Children's Information
            </h2>
            <p className="font-semibold text-foreground">
              CreatorSpot is intended for people 18 years of age or older.
            </p>
            <p>
              You must not create or use a CreatorSpot account if you are under 18. By registering for CreatorSpot, you represent that you are at least 18 years old. CreatorSpot does not intentionally design its service for children.
            </p>
            <p>
              If you believe that a person under 18 has provided personal information to CreatorSpot, contact:{' '}
              <a
                href="mailto:creatorspot08@gmail.com"
                className="text-accent hover:underline font-semibold"
              >
                creatorspot08@gmail.com
              </a>
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              20. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy when the service, technology, data practices, or applicable legal requirements change.
            </p>
            <p>
              When we make material changes, we may update the effective date and provide additional notice where appropriate. You should periodically review this page for the latest version.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border pb-8">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              21. Contact
            </h2>
            <p>CreatorSpot</p>
            <p>
              Email:{' '}
              <a
                href="mailto:creatorspot08@gmail.com"
                className="text-accent hover:underline font-semibold"
              >
                creatorspot08@gmail.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </PublicLayout>
  );
};
