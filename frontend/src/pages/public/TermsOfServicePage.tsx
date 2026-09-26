import React from 'react';
import { PublicLayout } from '../../components/layout/PublicLayout';

export const TermsOfServicePage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Page Header */}
        <header className="border-b border-border pb-8 mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent">
            Legal Documentation
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm text-foreground-muted">
            Effective Date: <span className="font-semibold text-foreground">October 8, 2026</span>
          </p>
        </header>

        {/* Content Body */}
        <article className="prose prose-neutral max-w-none space-y-10 text-foreground text-sm sm:text-base leading-relaxed">
          <p className="text-base sm:text-lg text-foreground leading-relaxed">
            Welcome to CreatorSpot.
          </p>
          <p>
            These Terms & Conditions govern your access to and use of the CreatorSpot platform.
          </p>
          <p>
            By creating an account or using CreatorSpot, you agree to these Terms. If you do not agree with these Terms, you should not use CreatorSpot.
          </p>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              1. About CreatorSpot
            </h2>
            <p>
              CreatorSpot is an independently operated online platform designed to connect businesses and creators.
            </p>
            <p>The platform provides tools for:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Creator discovery</li>
              <li>Business and creator profiles</li>
              <li>Structured collaboration inquiries</li>
              <li>Inquiry acceptance or rejection</li>
              <li>Controlled exchange of collaboration contact information</li>
              <li>Basic inquiry-status tracking</li>
              <li>Saved creators</li>
              <li>Platform notifications</li>
            </ul>
            <p>
              CreatorSpot is a connection and discovery platform. CreatorSpot does not itself become a party to a collaboration between a Business and a Creator.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              2. What CreatorSpot Does Not Provide
            </h2>
            <p className="font-medium text-foreground">CreatorSpot does not currently provide:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Payment processing</li>
              <li>Escrow</li>
              <li>Invoices</li>
              <li>Contracts</li>
              <li>Campaign management</li>
              <li>Project management</li>
              <li>Deliverable submission</li>
              <li>Deliverable approval</li>
              <li>File sharing</li>
              <li>In-app messaging</li>
              <li>Campaign analytics</li>
              <li>Ratings or reviews</li>
              <li>Dispute mediation</li>
              <li>Legal services</li>
              <li>Tax services</li>
            </ul>
            <p>
              After a Creator accepts an inquiry, the parties may communicate and collaborate outside CreatorSpot.
            </p>
            <p>
              Any commercial agreement, payment, contract, deliverable, deadline, usage-right arrangement, or other business relationship between the parties is between those parties.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              3. Eligibility
            </h2>
            <p className="font-semibold text-foreground">
              You must be at least 18 years old to use CreatorSpot.
            </p>
            <p>By creating an account, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>You are at least 18 years old.</li>
              <li>The information you provide is accurate to the best of your knowledge.</li>
              <li>You are legally permitted to use the service.</li>
              <li>You will comply with applicable laws.</li>
            </ul>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              4. Account Registration
            </h2>
            <p>
              You must provide accurate information when creating your account. Depending on your account type, you may create a Creator or Business profile.
            </p>
            <p>
              You are responsible for keeping your account information accurate and up to date.
            </p>
            <p>You must not:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Create an account using another person's identity.</li>
              <li>Impersonate another person or business.</li>
              <li>Provide deliberately misleading profile information.</li>
              <li>Create accounts for fraudulent purposes.</li>
              <li>Circumvent account restrictions.</li>
            </ul>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              5. Account Security
            </h2>
            <p>
              You are responsible for maintaining the security of the credentials and email account associated with your CreatorSpot account.
            </p>
            <p>
              You should notify CreatorSpot if you believe that your account has been accessed without authorization. CreatorSpot may take reasonable steps to protect accounts and the platform from unauthorized use.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              6. Creator Profiles
            </h2>
            <p>Creators may publish information including:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Name</li>
              <li>Profile photograph</li>
              <li>Niche</li>
              <li>Location</li>
              <li>Biography</li>
              <li>Specialties</li>
              <li>Instagram</li>
              <li>YouTube</li>
            </ul>
            <p>
              You are responsible for ensuring that information you publish is accurate and does not violate another person's rights. You must not upload content that you do not have the right to use.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              7. Business Profiles
            </h2>
            <p>Businesses may publish information including:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Business or brand name</li>
              <li>Category</li>
              <li>Description</li>
              <li>Location</li>
              <li>Logo</li>
              <li>Website</li>
              <li>Instagram</li>
            </ul>
            <p>
              You represent that you are authorized to represent the business or brand associated with your account.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              8. Collaboration Inquiries
            </h2>
            <p>Businesses may send structured collaboration inquiries to Creators. An inquiry may include:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Collaboration type</li>
              <li>Social platform</li>
              <li>Proposed deliverables</li>
              <li>Proposed timeline</li>
              <li>Brief</li>
              <li>Additional requirements</li>
            </ul>
            <p>
              Creators may accept or reject inquiries at their discretion. CreatorSpot does not guarantee that a Creator will respond, a Creator will accept an inquiry, a Business will receive a response, a collaboration will take place, or a collaboration will be commercially successful.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              9. Inquiry Expiration
            </h2>
            <p className="font-semibold text-foreground">
              An unanswered inquiry automatically expires after 60 days from creation under the current platform rules.
            </p>
            <p>
              An expired inquiry does not constitute an accepted collaboration. CreatorSpot may also close an inquiry when an associated account or collaboration relationship becomes unavailable.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              10. Duplicate Active Inquiries
            </h2>
            <p>
              CreatorSpot may prevent a Business from creating another overlapping active inquiry with the same Creator while an existing active inquiry remains pending or accepted.
            </p>
            <p>
              This is a platform integrity mechanism and does not guarantee that the parties will ultimately collaborate.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              11. Contact Information
            </h2>
            <p>
              CreatorSpot does not publicly display users' collaboration email addresses.
            </p>
            <p>
              For an accepted inquiry, CreatorSpot may make the collaboration email available to the two participants of that inquiry.
            </p>
            <p>You must not use contact information obtained through CreatorSpot to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Spam another user</li>
              <li>Harass another user</li>
              <li>Send unsolicited bulk communications</li>
              <li>Sell or redistribute the contact information</li>
              <li>Attempt to circumvent CreatorSpot's access controls</li>
            </ul>
            <p>
              Contact information obtained through CreatorSpot should only be used for legitimate communication relating to the relevant collaboration or relationship.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              12. Acceptable Use
            </h2>
            <p>You agree not to use CreatorSpot to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-foreground-muted">
              <li>Commit fraud.</li>
              <li>Impersonate another person or organization.</li>
              <li>Harass, threaten, or abuse another user.</li>
              <li>Send spam or malicious inquiries.</li>
              <li>Distribute malware.</li>
              <li>Attempt unauthorized access to the platform.</li>
              <li>Circumvent authentication or authorization controls.</li>
              <li>Scrape CreatorSpot at scale without permission.</li>
              <li>Collect profile information for unauthorized databases or commercial lists.</li>
              <li>Manipulate or abuse platform functionality.</li>
              <li>Upload unlawful content.</li>
              <li>Violate another person's intellectual-property, privacy, publicity, or other rights.</li>
              <li>Use CreatorSpot for any unlawful purpose.</li>
            </ul>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              13. Platform Abuse
            </h2>
            <p>
              CreatorSpot may restrict, suspend, deactivate, or terminate accounts where there is reasonable evidence of fraud, abuse, harassment, security threats, impersonation, repeated spam, unauthorized access, violation of these Terms, or violation of applicable law.
            </p>
            <p>
              Where appropriate, CreatorSpot may preserve relevant records for security, legal, or operational purposes.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              14. User Content
            </h2>
            <p>
              You retain ownership of content that you submit to CreatorSpot, subject to the rights necessary for operating the service. This may include profile photographs, logos, bios, descriptions, social-media links, profile information, and inquiry content.
            </p>
            <p>
              By submitting content to CreatorSpot, you grant CreatorSpot a limited, non-exclusive right to host, store, process, reproduce, and display that content as reasonably necessary to provide and operate the platform. This permission does not transfer ownership of your content to CreatorSpot.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              15. User Responsibility for Content
            </h2>
            <p>
              You are responsible for the content and information you submit. You represent that you have the necessary rights and permissions to submit and display that content. You must not upload content that infringes another person's intellectual-property rights or violates applicable law.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              16. External Collaborations
            </h2>
            <p>
              CreatorSpot does not control relationships formed between users. If a Business and Creator collaborate after connecting through CreatorSpot, they are responsible for determining their own:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Commercial terms</li>
              <li>Payment arrangements</li>
              <li>Contracts</li>
              <li>Deliverables</li>
              <li>Deadlines</li>
              <li>Intellectual-property rights</li>
              <li>Content usage rights</li>
              <li>Advertising disclosures</li>
              <li>Taxes</li>
              <li>Cancellation terms</li>
              <li>Dispute arrangements</li>
            </ul>
            <p>
              CreatorSpot does not guarantee the conduct, reliability, identity, financial ability, or performance of another user. Users should conduct their own due diligence before entering into a commercial relationship.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              17. No Guarantee of Results
            </h2>
            <p>
              CreatorSpot does not guarantee a minimum number of inquiries, collaborations, income, business opportunities, creator growth, audience growth, sales, brand exposure, or commercial success. The platform is provided to facilitate discovery and introductions.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              18. Account Deactivation
            </h2>
            <p>
              You may deactivate your account through the available account settings. When an account is deactivated, it is removed from normal public discovery.
            </p>
            <p className="font-semibold text-foreground">
              CreatorSpot currently provides a 30-day reactivation period following deactivation.
            </p>
            <p>
              During this period, you may reactivate the account subject to the platform's available functionality.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              19. Permanent Deletion
            </h2>
            <p>
              If an account remains deactivated through the applicable 30-day period, CreatorSpot may permanently delete or anonymize the account.
            </p>
            <p>Permanent deletion may result in:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Removal of private collaboration contact information</li>
              <li>Anonymization of profile identity</li>
              <li>Removal of the active authentication account</li>
              <li>Closure of active relationships</li>
            </ul>
            <p>
              Certain historical information may be retained in anonymized or otherwise limited form where necessary for legitimate operational, security, legal, or recordkeeping purposes.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              20. Intellectual Property of CreatorSpot
            </h2>
            <p>
              The CreatorSpot platform itself, including its software, design, branding, interfaces, logos, and original platform content, is owned by or licensed to the operator of CreatorSpot unless otherwise stated.
            </p>
            <p>
              You may not copy, reproduce, modify, distribute, reverse engineer, or commercially exploit the platform except where permitted by applicable law or with appropriate permission.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              21. Third-Party Services and Links
            </h2>
            <p>
              CreatorSpot may rely on third-party services and may contain links to external websites or social platforms. These services are not controlled by CreatorSpot.
            </p>
            <p>
              Your use of third-party services is subject to their own terms and privacy policies. CreatorSpot is not responsible for the availability, security, accuracy, or practices of third-party services.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              22. Availability
            </h2>
            <p>
              CreatorSpot is provided on an evolving basis. We may add features, remove features, modify functionality, temporarily suspend functionality, perform maintenance, or change technical infrastructure.
            </p>
            <p>
              We do not guarantee that CreatorSpot will always be available, uninterrupted, or error-free.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              23. Disclaimer
            </h2>
            <p>
              To the extent permitted by applicable law, CreatorSpot is provided on an "as is" and "as available" basis.
            </p>
            <p>CreatorSpot does not guarantee:</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Accuracy of user-provided information</li>
              <li>Availability of another user</li>
              <li>Successful collaboration</li>
              <li>Commercial results</li>
              <li>Uninterrupted operation</li>
              <li>That all platform content will always be accurate or current</li>
            </ul>
            <p>
              You are responsible for evaluating the suitability of any person or business you choose to work with.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              24. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, CreatorSpot and its operator will not be responsible for losses arising from:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-foreground-muted">
              <li>Agreements between users</li>
              <li>Payments between users</li>
              <li>Unpaid invoices</li>
              <li>Failed collaborations</li>
              <li>Missed deadlines</li>
              <li>Deliverable disputes</li>
              <li>Intellectual-property disputes between users</li>
              <li>Misrepresentations made by users</li>
              <li>Conduct of users outside the platform</li>
              <li>External websites or services</li>
              <li>Business decisions made based on information available through CreatorSpot</li>
            </ul>
            <p>
              Nothing in these Terms excludes liability that cannot legally be excluded under applicable law.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              25. Indemnity
            </h2>
            <p>
              To the extent permitted by applicable law, you agree to be responsible for claims, losses, liabilities, and reasonable expenses arising from your violation of these Terms, violation of applicable law, misuse of CreatorSpot, infringement of another person's rights, content submitted to the platform, or conduct toward another user.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              26. Changes to These Terms
            </h2>
            <p>
              CreatorSpot may update these Terms when the platform or applicable requirements change.
            </p>
            <p>
              If material changes are made, CreatorSpot may update the effective date and provide additional notice where appropriate. Continued use of CreatorSpot after updated Terms become effective constitutes acceptance of the updated Terms to the extent permitted by applicable law.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              27. Governing Law
            </h2>
            <p className="font-semibold text-foreground">
              These Terms are intended to be governed by the laws applicable in India.
            </p>
            <p>
              The specific court/jurisdiction provision will be finalized when the operator's applicable jurisdiction is determined.
            </p>
            <p>
              Nothing in this section is intended to remove rights or remedies that cannot legally be excluded under applicable law.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border pb-8">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              28. Contact
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
