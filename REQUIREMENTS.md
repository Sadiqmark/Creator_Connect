# System Specification & Implementation Blueprint

> **Project:** Creator Connect  
> **Document:** `REQUIREMENTS.md`  
> **Purpose:** Single source of truth for implementation in an AI-native coding environment (Gemini Anti-Gravity IDE).  
> **Specification status:** Product/UX architecture and MVP boundaries are locked unless explicitly changed by a future requirements update.

## 1. Project Overview & Architecture

### Core Value Proposition & Goals

Creator Connect is a two-sided creator-discovery and collaboration-request platform connecting **Businesses** with **Creators**.

The core workflow is:

```text
Discover → Evaluate profile → Send structured inquiry → Creator reviews
→ Accept / Reject → Collaboration confirmed → Controlled contact exchange
→ External collaboration
```

Creator Connect is not intended to replace Instagram or email. It owns the discovery, structured inquiry, decision, tracking, and controlled contact-exchange layer before actual collaboration.

### Business capabilities

- Register and verify a Business account.
- Create and manage a Business Profile.
- Discover, search/filter, and view Creators.
- Save/unsave Creators.
- Send structured collaboration inquiries.
- Track inquiry states.
- View inquiry details.
- Receive header notifications.
- Access a Creator's Collaboration Email only after that Creator accepts the inquiry.
- Use email or Instagram for external communication after acceptance.

### Creator capabilities

- Register and verify a Creator account.
- Complete and manage a professional Creator Profile.
- Showcase Instagram and YouTube.
- Provide a private Collaboration Email.
- Receive and manage collaboration inquiries.
- View inquiry details.
- Accept or reject inquiries.
- Track inquiry states.
- Know when their Collaboration Email is shared after acceptance.
- Access the Business's appropriate collaboration contact after acceptance.
- Continue the actual collaboration externally.

### MVP boundaries

The MVP **does not** include:

- In-app chat/messaging.
- Campaign management.
- Project management.
- Collaboration workspace.
- Contract management.
- Payments.
- Invoices.
- Earnings.
- Deliverable tracking.
- File sharing.
- Content submission.
- Content approval workflow.
- Campaign analytics.
- Creator ratings.
- Business ratings.
- Advanced notification center.

After acceptance, actual collaboration happens externally, primarily through professional email and optionally Instagram.

### Architectural Overview

The prior product/UX discussion defined the domain architecture and behavior but did **not** lock a concrete frontend framework, backend framework, database engine, or cloud provider. The implementation must therefore select concrete technologies without pretending that an unapproved technology choice is already part of the specification.

Recommended logical separation:

```text
Presentation / UI
        ↓
Application / Use Cases
        ↓
Domain Rules
        ↓
Repositories / Data Access
        ↓
Database / External Services
```

Cross-cutting concerns:

```text
Authentication
Authorization
Validation
Error Handling
Logging
Notifications
Audit/Event History
```

Server state includes Creators, Businesses, Profiles, Inquiries, Saved Creators, Notifications, account status, inquiry status, and relationship-based contact access. Local UI state should remain local where practical; do not put every modal, form field, or temporary UI state into global state.

### System Diagram / Flow Description

```text
                         CREATOR CONNECT
                               │
               ┌───────────────┴───────────────┐
               │                               │
           BUSINESS                         CREATOR
               │                               │
          Discover                         Profile
               │                               │
       Creator Profile              Received Inquiries
               │                               │
       Save / Send Inquiry                View Inquiry
               │                               │
               └──────────────┬────────────────┘
                              ↓
                           INQUIRY
                              ↓
                           PENDING
                         /    │     \
                        ↓     ↓      ↓
                   ACCEPTED REJECTED EXPIRED
                        │
                        ↓
              Collaboration Confirmed
                        │
                        ↓
              Contact access granted
                        │
                  ┌─────┴─────┐
                  ↓           ↓
                EMAIL      INSTAGRAM
                  │           │
                  └─────┬─────┘
                        ↓
              External Collaboration
```

Global state mapping:

| Situation | Required behavior |
|---|---|
| Unauthenticated protected access | Login/authentication flow |
| Session/token invalid | Session Expired |
| Authenticated but unauthorized | 403 Forbidden |
| Resource/page does not exist | 404 Not Found |
| No data | Contextual Empty State |
| Data loading | Skeleton/loading state |
| Validation failure | Inline/contextual validation |
| API/server failure | Contextual error + Retry |
| Network unavailable | Offline/network feedback; never fake success |

---

# 2. Functional Requirements & Features

## 2.1 Landing & Role Selection

**Purpose:** Let users select whether they use Creator Connect as a Creator or Business.

**Flow:**

```text
Landing → Role Selection → Creator Registration / Business Registration
```

Selections:

- `I'm a Creator`
- `I'm a Business`

The server-authoritative role controls permissions and the eventual dashboard.

---

## 2.2 Authentication

**Purpose:** Secure account access.

**Features:**

- Registration.
- Login.
- Logout.
- Email verification.
- Forgot Password.
- Reset Password.
- Session expiry.
- Role-based redirect.
- Protected routes.

**Role redirect:**

```text
Creator  → Creator Dashboard
Business → Business Dashboard
```

**Session expiry:**

```text
API 401 → invalidate session → Session Expired → Sign In Again
```

The finalized Session Expired UI uses the heading **"Your session has expired"**, a non-technical explanation, **"Sign In Again"** as the primary action, and **"Go to Home"** as a secondary navigation option. Do not expose JWT, token, stack-trace, or HTTP implementation details.

Where safe, preserve the original intended destination through re-authentication.

**Logical auth API capabilities:**

```text
Auth
 ├── register
 ├── login
 ├── logout
 ├── verify-email
 ├── forgot-password
 └── reset-password
```

Exact endpoint names are implementation choices.

---

## 2.3 Authorization & Protected Routes

**Purpose:** Ensure users can access only resources appropriate to their role and relationship.

Role-level rules:

```text
Creator  → Creator routes
Business → Business routes
```

Wrong role → 403.

Resource-level authorization is also mandatory:

```text
Business A → Business B inquiry → 403
Creator A  → Creator B private inquiry → 403
```

Being a valid Business or Creator is not sufficient to access another user's private resource.

Authorization must be enforced server-side; hiding navigation in the frontend is not security.

---

## 2.4 Creator Registration & Onboarding

**Purpose:** Create a usable Creator account and collect the required professional profile data during onboarding.

**Flow:**

```text
Choose Creator → Register → Verify Email → Creator Profile Setup → Creator Dashboard
```

**Required Creator information:**

- Profile photo.
- Creator name.
- Primary niche.
- Location.
- Bio.
- Content specialties.
- Instagram.
- YouTube.
- Collaboration Email.

**Collaboration Email rule:**

> This email will only be shared with businesses after you accept their inquiry.

It is required because accepted inquiries need a professional communication channel.

Existing Creators missing the field should be prompted to complete it; they should not be unnecessarily blocked from the rest of the application, but accepting a new inquiry requires a usable Collaboration Email.

---

## 2.5 Creator Profile Management

**Purpose:** Maintain the Creator's professional identity.

Public information:

- Name.
- Profile photo.
- Niche.
- Location.
- Bio.
- Specialties.
- Instagram.
- YouTube.

Private information:

- Collaboration Email.

Required behavior:

- View/edit profile.
- Validate required fields.
- Save changes.
- Show saving state.
- Show success state.
- Preserve data where practical on recoverable failures.
- Handle image upload failure.
- Validate social URLs.
- Never expose Collaboration Email on public profile APIs.

---

## 2.6 Public Creator Profile

**Purpose:** Let Businesses evaluate a Creator before sending an inquiry.

The finalized design includes:

- Creator identity.
- Profile photo.
- Niche.
- Location.
- Instagram.
- YouTube.
- Follower information where represented by the finalized data/UI.
- About/Bio.
- Creator details.
- Content specialties.
- "Why Brands Work With Creator" style content where included by the finalized UI.

Business actions:

- Save Creator.
- Send Inquiry.

The Collaboration Email remains hidden until an accepted relationship exists.

---

## 2.7 Business Registration & Onboarding

**Purpose:** Create a Business account and collect sufficient identity information for Creators to understand who is contacting them.

**Flow:**

```text
Choose Business → Register → Verify Email → Business Profile Setup → Business Dashboard
```

---

## 2.8 Business Profile

**Purpose:** Represent the Business professionally and allow Creators to understand the Business behind an inquiry.

Core information:

- Business name.
- Business category.
- Business description.
- City.
- State/Province.
- Country.
- Collaboration/contact email.

Optional information:

- Logo.
- Website.
- Instagram.

Local businesses may have no website or logo. Missing optional information must be valid and must not make the profile look broken. Use the established initials/avatar fallback for missing logos.

Required behavior:

- View.
- Edit.
- Validation.
- Save.
- Success.
- Upload failure handling.

---

## 2.9 Business Profile — Creator View

**Purpose:** Let a Creator understand the Business behind a received inquiry.

This is read-only.

Display:

- Business identity.
- Category.
- Description.
- Location.
- Optional website.
- Optional Instagram.
- Logo or initials fallback.

Do not introduce:

- Campaign/project listings.
- Business editing.
- Save Business.
- Maps/statistics.
- Campaign management.
- Contact access that bypasses the accepted-inquiry privacy rule.

---

## 2.10 Business Dashboard

**Purpose:** Provide a Business operational overview.

The finalized dashboard concept includes:

- Saved Creators.
- Total Inquiries.
- Pending.
- Accepted.
- Rejected.
- Recent Inquiries.
- Recently Saved Creators.
- Find/Discover Creators action.

Empty states include no inquiries and no saved creators.

---

## 2.11 Creator Dashboard

**Purpose:** Provide the Creator operational home.

It should provide access to:

- Creator Profile.
- Received Inquiries.
- Pending inquiries.
- Accepted inquiries.
- Rejected/Expired information as appropriate.
- Settings.

Do not expose Business-only navigation such as Discover Creators, Saved Creators, or Create Inquiry.

---

## 2.12 Creator Discovery

**Purpose:** Let Businesses find suitable Creators.

**Flow:**

```text
Business Dashboard → Discover Creators → Search/Filter → Creator Cards → Creator Profile
```

Requirements:

- Creator cards.
- Search/filter controls represented by the finalized UI.
- Public Creator Profile navigation.
- Save Creator.
- Send Inquiry.

States:

- Loading/skeleton.
- No results.
- API failure.
- Network failure.
- Creator no longer exists → 404/resource-not-found behavior.

---

## 2.13 Save / Unsave Creator

**Purpose:** Let Businesses maintain a shortlist.

**Flow:**

```text
Creator Profile → Save → Saved Creators
```

Requirements:

- Prevent duplicate saved relationships.
- Consistent saved state across cards/profile.
- Empty state.
- Action loading.
- Failure reconciliation.

Logical API capabilities:

```text
Saved Creators
 ├── save
 ├── remove
 └── list
```

---

## 2.14 Structured Collaboration Inquiry

**Purpose:** Represent a Business's structured collaboration proposal to a specific Creator.

The Inquiry is the central transactional entity.

```text
Business → Inquiry → Creator
```

The Inquiry represents the structured proposal and includes the finalized concept of:

- Collaboration type.
- Platform.
- Deliverables.
- Timeline/start/end dates where applicable.
- Collaboration/campaign brief.
- Additional requirements/information.

Do not create a separate Campaign or Project entity for this MVP.

**Flow:**

```text
Business → Creator Profile → Send Inquiry → Inquiry Form → Submit → PENDING
```

During submission show a disabled/loading action such as `Sending...`.

On success: create PENDING inquiry.

On failure:

- Show contextual error.
- Preserve entered data where practical.
- Allow retry.
- Do not display false success.

---

## 2.15 Inquiry State Machine

Final states:

```text
PENDING
  ├── Creator accepts → ACCEPTED
  ├── Creator rejects → REJECTED
  └── 60 days without response → EXPIRED
```

Account unavailability is handled separately:

```text
Participant becomes unavailable → CLOSED / unavailable
```

Meanings:

| State | Meaning |
|---|---|
| PENDING | Business sent inquiry; Creator has not responded |
| ACCEPTED | Creator explicitly accepted; collaboration is confirmed |
| REJECTED | Creator explicitly rejected |
| EXPIRED | No response for 60 days |
| CLOSED | Relationship cannot proceed because an involved account/resource is unavailable |

Do not use REJECTED for expiration or account deletion.

Valid decision transitions are:

```text
PENDING → ACCEPTED
PENDING → REJECTED
PENDING → EXPIRED
```

The backend must reject invalid transitions and make valid transitions atomic.

---

## 2.16 Duplicate Inquiry Rule

Only one active inquiry may exist between a specific Business and Creator at a time.

Recommended active states:

```text
PENDING  → no second inquiry
ACCEPTED → no second active inquiry while current relationship is active
```

After:

```text
REJECTED / EXPIRED / CLOSED → new inquiry may be created when appropriate
```

UI for an existing active inquiry:

```text
Inquiry Sent
[View Inquiry]
```

with contextual wording such as:

> You already have an active inquiry with this creator.

The rule must also be enforced server-side/database-side to protect against concurrent requests.

---

## 2.17 Business — My Inquiries

**Purpose:** Centralized list of inquiries sent by the Business.

Finalized UI concepts include:

- All.
- Pending.
- Accepted.
- Rejected.
- Creator.
- Collaboration information.
- Sent date.
- Status.
- View action.

The implementation should also represent Expired and Closed states where relevant to the final lifecycle.

Flow:

```text
Business Dashboard → My Inquiries → Filter → Inquiry Details
```

---

## 2.18 Business — Inquiry Details

Display:

- Creator.
- Collaboration type.
- Deliverables.
- Timeline.
- Brief.
- Additional requirements.
- Current status.

Pending: show waiting for Creator response.

Accepted: show accepted/collaboration confirmed, authorized Creator contact information, Instagram where available, and original inquiry details.

Rejected: show rejected state and no acceptance/contact controls.

Expired: explain that no response was received within 60 days; no Accept/Reject controls.

Closed: explain that the inquiry is no longer active because the associated participant/account is unavailable; no decision controls.

---

## 2.19 Creator — Received Inquiries

**Purpose:** Let Creators manage collaboration proposals received from Businesses.

Flow:

```text
Creator Dashboard → Received Inquiries → All/Pending/Accepted/Rejected/Expired → Inquiry Detail
```

Display Business identity, collaboration information, status, and navigation to details.

This screen has been finalized and is considered complete.

---

## 2.20 Creator — Inquiry Details

**Purpose:** Let the Creator inspect the proposal and decide whether to accept or reject it.

Display:

- Business information.
- Collaboration details.
- Deliverables.
- Timeline.
- Brief.
- Additional information.
- Current status.

Pending actions:

```text
[Accept]
[Reject]
```

Accept:

```text
PENDING → ACCEPTED → Collaboration confirmed
```

Reject:

```text
PENDING → REJECTED
```

The Creator Inquiry Detail and Creator Accept Inquiry interaction have been finalized and are considered complete.

---

## 2.21 Post-Acceptance Collaboration Workflow

**Purpose:** Provide a clear handoff from platform-managed inquiry to external collaboration.

Final MVP process:

```text
Creator accepts
  ↓
Inquiry = ACCEPTED
  ↓
Collaboration confirmed
  ↓
Business notified
  ↓
Creator Collaboration Email becomes available to authorized Business
  ↓
Business Collaboration Email becomes available to authorized Creator where applicable
  ↓
Email / Instagram
  ↓
External collaboration
```

The accepted inquiry remains accessible as the record of the structured proposal.

### Creator accepted state

Show:

- Collaboration confirmed.
- Business identity.
- Business notified message.
- Explicit message that the Creator's collaboration email has been shared with the Business.
- Business collaboration contact where authorized.
- Inquiry details.
- Email Business action where authorized.

### Business accepted state

Show:

- Inquiry accepted.
- Creator identity.
- Creator Collaboration Email.
- Email Creator action.
- Instagram action where available.
- Original inquiry details.

Do not build an in-app collaboration workspace.

---

## 2.22 Collaboration Email Privacy

Collaboration Email is private relationship data.

| Situation | Creator email | Business email |
|---|---:|---:|
| Guest/public profile | Hidden | Hidden/private |
| Business views Creator before acceptance | Hidden | N/A |
| Pending inquiry | Hidden | N/A |
| Rejected inquiry | Hidden | N/A |
| Accepted inquiry | Authorized Business can access | Authorized Creator can access where applicable |
| Unauthorized user | Hidden | Hidden |

The backend must enforce privacy. Never return a private email to the client and rely on React/CSS to hide it.

Conceptually:

```text
Public Creator Profile API → collaborationEmail excluded
Pending Inquiry API        → collaborationEmail excluded
Accepted Inquiry API       → authorized collaboration contact returned
```

---

## 2.23 Collaboration Email Changes

If a Creator changes their Collaboration Email:

```text
Old email → New email → verify/update → notify accepted counterparties
```

Only Businesses with an accepted collaboration relationship should receive the new contact information.

The same relationship-based principle applies to Business collaboration contact information where applicable.

---

## 2.24 60-Day Inquiry Expiration

A Pending inquiry expires 60 days after creation if it remains Pending.

```text
created_at + 60 days
  ↓
Still PENDING?
  ↓
EXPIRED
```

The expiration should be performed by a backend scheduled job/process.

The job must:

1. Find Pending inquiries older than 60 days.
2. Atomically transition each still-Pending inquiry to Expired.
3. Create the appropriate notification.
4. Record the event.
5. Leave Accepted/Rejected/Closed inquiries unchanged.
6. Be safe to retry.

Expired inquiries cannot be accepted or rejected and can be followed by a new inquiry later.

---

## 2.25 Account Deletion / Unavailability

Do not treat account deletion as Creator rejection.

Use soft deletion initially:

```text
User.status = ACTIVE
User.status = DELETED
```

When an account is deleted:

1. Invalidate its session.
2. Prevent new activity.
3. Prevent new inquiries involving the unavailable account.
4. Identify affected active inquiries/relationships.
5. Mark affected relationships as CLOSED/unavailable where the collaboration cannot proceed.
6. Preserve appropriate historical inquiry records.
7. Protect/anonymize private data according to applicable retention/privacy rules.
8. Record the event and create appropriate notifications where required.

`REJECTED` means explicit human rejection; `EXPIRED` means no response; `CLOSED` means account/resource unavailability.

---

## 2.26 Notifications

### MVP decision

A dedicated notification center is **not required**. Use header notifications.

Required event types:

| Event | Recipient |
|---|---|
| New inquiry | Creator |
| Inquiry accepted | Business |
| Inquiry rejected | Business |
| Inquiry expired | Relevant party/parties |
| Collaboration email updated | Accepted counterparties |

Notifications should be generated from real backend/domain events, not optimistic UI.

Logical API capabilities:

```text
Notifications
 ├── list
 └── mark-read
```

---

## 2.27 Settings

Features:

- Account settings.
- Change Password.
- Logout.
- Delete Account.
- Notification preferences where included by the finalized UI.

Change Password states:

```text
Default → Validation → Submitting → Success/Error
```

Delete Account requires confirmation, then invalidates the session and applies the account-deletion policy.

---

## 2.28 Loading / Skeleton States

Use reusable loading patterns for:

- Business Dashboard.
- Creator Dashboard.
- Discover Creators.
- Creator Profile.
- Business Profile.
- My Inquiries.
- Received Inquiries.
- Inquiry Details.
- Notifications where applicable.

Action-level states include:

```text
[Sending...]
[Accepting...]
[Rejecting...]
[Saving...]
[Uploading...]
[Updating...]
[Deleting...]
```

Disable the corresponding action while the request is in progress.

Do not create a unique Stitch page for every loading state.

---

## 2.29 Empty States

Business:

- No saved creators.
- No inquiries.
- No filtered/search results.

Creator:

- No received inquiries.
- No inquiries for a selected status.

Empty states must clearly distinguish no data from an error and provide a useful next action where appropriate.

---

## 2.30 Validation

Validate:

- Required fields.
- Email format.
- URL format for Instagram/YouTube/website.
- Image type.
- Image size.
- Inquiry required fields.
- Timeline/date validity.
- Password requirements according to the selected authentication implementation.

Client validation is for UX; server validation is authoritative.

---

## 2.31 API / Server Errors

Read failure example:

> Unable to load inquiries. Please try again.

Mutation failure example:

> Unable to send inquiry. Your inquiry couldn't be submitted.

Provide Retry where appropriate. Do not expose stack traces, database errors, JWT details, or implementation-specific exception messages.

---

## 2.32 Network Failures

If offline/unreachable:

> You're offline. Check your internet connection and try again.

Never show success unless the server confirmed the mutation. Revalidate after reconnection.

---

## 2.33 Upload Failures

Creator profile photo and Business logo uploads follow:

```text
Select → Validate → Uploading... → Success
```

Failure:

> Upload failed. Please try again.

Validate file type, size, and image validity. A missing Business logo remains a valid state.

---

## 2.34 403 Forbidden

Finalized UI:

- Access denied.
- Go to Dashboard.
- Go Back.
- Existing application header/footer treatment.

Use 403 for authenticated users without the required role/resource permission.

---

## 2.35 404 Not Found

Finalized UI:

- 404.
- Page not found.
- Clear explanation.
- Go to Dashboard.
- Go Back.
- Existing application header/footer treatment.

Use 404 for nonexistent pages/resources, including a Creator/resource that no longer exists.

---

# 3. Non-Functional Requirements

## 3.1 Performance

No concrete numeric performance budgets were finalized in the product discussion. The implementation team must establish measurable production budgets rather than inventing them as existing requirements.

Required principles:

- Lazy-load large/non-critical modules where beneficial.
- Avoid loading irrelevant role-specific modules.
- Paginate or incrementally load large Creator and Inquiry collections.
- Cache server state where appropriate while preventing unacceptable inquiry/privacy staleness.
- Revalidate important inquiry state after mutations.
- Avoid unnecessary global state updates.
- Optimize profile image delivery.
- Prevent duplicate network requests.

Performance-sensitive areas include Creator Discovery, dashboards, Inquiry lists, profiles, and notifications.

---

## 3.2 Security & Auth

### Authentication

- Never store raw passwords.
- Securely hash passwords or delegate to a secure auth provider.
- Secure session/token handling.
- Reliable logout/session invalidation.
- Session expiration handling.

### Authorization

Use:

```text
Authentication + Role + Resource ownership/relationship
```

Server-side authorization is mandatory.

### Private data

Collaboration emails must not be exposed in public profile/search responses or unauthorized inquiry responses.

### Input sanitization

- Validate/sanitize user-generated text.
- Validate URLs and email addresses.
- Protect database, HTML, logs, and external-service boundaries from injection.
- Safely render user content.
- Never trust only client-side validation.

### Logging

Do not log passwords, session secrets, or unnecessary private collaboration email data.

---

## 3.3 Scalability & Code Organization

Recommended logical organization:

```text
src/
├── app/
│   ├── routes/
│   ├── layouts/
│   └── providers/
├── features/
│   ├── auth/
│   ├── creators/
│   ├── businesses/
│   ├── inquiries/
│   ├── saved-creators/
│   ├── notifications/
│   └── settings/
├── components/
│   ├── ui/
│   ├── forms/
│   ├── feedback/
│   └── navigation/
├── services/
│   ├── api/
│   ├── auth/
│   └── storage/
├── domain/
│   ├── inquiry/
│   ├── creator/
│   └── business/
├── utils/
└── types/
```

This is a logical recommendation, not a framework-specific mandate.

Use consistent domain terminology:

- Creator.
- Business.
- Inquiry.
- Pending.
- Accepted.
- Rejected.
- Expired.
- Closed.
- CollaborationEmail.

Do not reintroduce CampaignId, ProjectId, or separate Campaign/Project entities into the MVP.

Use reusable UI components, domain services/use cases, repositories/data-access abstractions where useful, centralized authorization/session/error handling, and server-side inquiry state transitions.

Avoid business rules embedded directly in UI components and duplicated inquiry-state logic across Creator and Business screens.

---

# 4. Comprehensive Edge Cases & Constraints

## 4.1 Inquiry

| Case | Expected behavior |
|---|---|
| New inquiry | PENDING |
| Creator accepts | ACCEPTED |
| Creator rejects | REJECTED |
| No response for 60 days | EXPIRED |
| Participant becomes unavailable | CLOSED/unavailable |
| Duplicate active inquiry | Block |
| Re-inquiry after rejection | Allowed |
| Re-inquiry after expiration | Allowed |
| Accept after expiration | Block |
| Reject after expiration | Block |
| Decision after another decision | No invalid second transition |
| Stale pending view | Reconcile to current server state |

## 4.2 Contact Privacy

- Public Creator profile never exposes Collaboration Email.
- Pending inquiry never exposes Creator Collaboration Email.
- Rejected/Expired inquiry does not grant contact access.
- Accepted relationship grants authorized contact access.
- Unauthorized users never receive private email data.
- Email-change notifications go only to accepted counterparties.

## 4.3 Profile

Creator:

- Missing optional social information must not break the profile.
- Invalid Instagram/YouTube URL is rejected.
- Image upload failure must not destroy unrelated profile data.
- Existing Creator without Collaboration Email is prompted to complete it before accepting a new inquiry.

Business:

- No logo is valid.
- No website is valid.
- No Instagram is valid.
- Logo upload failure must not invalidate the profile.
- Initials/avatar fallback is used when logo is unavailable.

## 4.4 Search

- Zero results.
- API failure.
- Loading.
- Creator disappears between search and profile view.
- Filters return zero results.
- Rapid searches must not allow older responses to overwrite newer results.

## 4.5 Forms

- Missing required field.
- Invalid email.
- Invalid URL.
- Invalid timeline/date.
- Invalid image type.
- Oversized image.
- Server-side validation failure.
- Network interruption during submit.
- Retry.
- Double-click.

## 4.6 Account Deletion

- Deleted account cannot authenticate into active functionality.
- Deleted account cannot receive/create new inquiries.
- Existing inquiry history remains appropriately intact.
- Active affected inquiries can be Closed/unavailable.
- Do not classify account deletion as Rejected.
- Apply retention/anonymization rules to historical/private data.

## 4.7 Notifications

- Notifications must map to real backend events.
- Retries must not create duplicate notifications.
- Read/unread state must not mutate inquiry state.
- Header notifications are sufficient for MVP.

## 4.8 Offline/Reconnection

- Never fake mutation success.
- Show offline/retry feedback.
- Re-fetch/revalidate relevant server state after reconnection.
- Do not blindly replay mutations unless designed to be idempotent.

## 4.9 Concurrent Sessions

The system must remain correct across multiple tabs/devices. The server is the source of truth.

## 4.10 UX fallback matrix

| State | UX |
|---|---|
| Loading | Skeleton |
| Empty | Contextual Empty State |
| Validation | Inline validation |
| API failure | Error + Retry |
| Offline | Offline message + Retry |
| Unauthenticated | Login |
| Session expired | Session Expired |
| Unauthorized | 403 |
| Not found | 404 |
| Expired inquiry | Expired state |
| Closed inquiry | Closed/unavailable state |
| Upload failure | Inline upload error |
| Successful mutation | Success feedback + current authoritative state |

---

# 5. Error Handling & Failure Recovery

## 5.1 API/Network Failures

Read operations:

```text
Loading → Success
```

or:

```text
Loading → Error → Try Again
```

Mutations:

```text
Idle → Submitting → Success
```

or:

```text
Idle → Submitting → Failure → Retry
```

Mutation retries must not create duplicate records or state transitions.

---

## 5.2 Validation & Runtime Errors

Client validation improves UX; server validation is authoritative.

Validation errors must identify the field, explain correction, and preserve valid input.

Use a global runtime error boundary/framework equivalent for unexpected UI failures. Show safe recovery UI and keep stack traces out of the UI.

Internal logging should capture useful diagnostic context without secrets or unnecessary private data.

---

## 5.3 Edge Failure Recovery

### Failed Send Inquiry

- Preserve form data where practical.
- Show failure.
- Retry.
- Prevent duplicate inquiry creation.

### Failed Accept/Reject

- Keep authoritative server state.
- Show failure.
- Re-fetch/reconcile before retrying.
- If another session already changed the state, show current state.

### Failed Save Creator

- Do not leave a false saved state.
- Reconcile with server.

### Failed profile save

- Preserve entered data.
- Show error.
- Allow retry.

### Failed upload

- Keep profile usable.
- Allow retry.
- Preserve unrelated fields.

---

## 5.4 State Synchronization

For mutations:

```text
Mutation
  ↓
Authenticate
  ↓
Authorize
  ↓
Validate current domain state
  ↓
Atomic state change
  ↓
Persist notification/event where required
  ↓
Return current resource state
  ↓
Client reconciles
```

This keeps the backend authoritative.

---

## 5.5 Inquiry Transition Protection

Backend must enforce:

```text
PENDING → ACCEPTED
PENDING → REJECTED
PENDING → EXPIRED
```

A transition must validate current state and execute atomically.

Two concurrent decisions cannot produce both Accepted and Rejected.

---

## 5.6 Expiration Job

The expiration process must be retry-safe and only transition still-Pending inquiries older than 60 days.

It must not alter Accepted, Rejected, or Closed records.

---

## 5.7 Account Deletion Recovery

Use soft deletion initially.

On deletion:

1. Confirm destructive action.
2. Invalidate session.
3. Mark account deleted/unavailable.
4. Prevent new activity.
5. Identify affected active inquiries.
6. Close/unavailable affected relationships as appropriate.
7. Preserve required historical records.
8. Protect/anonymize private data according to policy.
9. Record relevant event/notification.

---

## 5.8 Error Classification

Use semantic separation where appropriate:

```text
401 → authentication/session problem
403 → authorization problem
404 → resource not found
409 → duplicate/state conflict where appropriate
422 → validation problem where appropriate
429 → rate limit where applicable
5xx → server/infrastructure failure
network failure → client cannot reach service
```

Exact framework-specific status choices may vary, but the semantic distinction is required.

---

# 6. Implementation Roadmap & Task Breakdown

The AI IDE must implement sequentially and preserve existing working infrastructure. Before changing code, inspect the repository and identify existing framework, routing, authentication, API/client architecture, state management, design system, database/backend, and existing Creator/Business/Inquiry code. Reuse working code where it already satisfies this specification.

## Phase 0 — Repository Audit

1. Inspect repository.
2. Identify frontend framework/build system.
3. Identify backend/framework or API boundary.
4. Identify routing.
5. Identify authentication/session implementation.
6. Identify state/server-state management.
7. Identify existing design system/components.
8. Identify database/data models.
9. Identify existing domain code.
10. Map finalized UI screens to current implementation.
11. Do not replace working infrastructure without justification.

## Phase 1 — Domain Model

Implement/verify:

```text
User
CreatorProfile
BusinessProfile
Inquiry
SavedCreator
Notification
Audit/Event
```

### User

Conceptual fields:

- id
- authentication identity
- role
- account status
- created timestamp
- updated timestamp
- deletion timestamp where applicable

Roles:

```text
CREATOR
BUSINESS
```

### CreatorProfile

- user_id
- name
- profile photo
- niche
- location
- bio
- specialties
- Instagram
- YouTube
- collaboration email
- timestamps

### BusinessProfile

- user_id
- business name
- category
- description
- city
- state/province
- country
- logo
- website
- Instagram
- collaboration email
- timestamps

### Inquiry

- id
- business_id
- creator_id
- collaboration details
- status
- created_at
- responded_at
- updated_at
- expiration-related information where useful

Statuses:

```text
PENDING
ACCEPTED
REJECTED
EXPIRED
CLOSED
```

### SavedCreator

- business_id
- creator_id
- created_at

Protect duplicate relationships.

### Notification

- id
- user_id
- event/type
- reference resource ID
- read_at
- created_at

### Audit/Event

- event ID
- event type
- actor where appropriate
- resource ID
- timestamp
- privacy-safe metadata

## Phase 2 — Authentication & Authorization Foundation

Implement:

1. Registration.
2. Login.
3. Logout.
4. Email verification.
5. Forgot password.
6. Reset password.
7. Session handling.
8. Session expiry.
9. Role detection.
10. Protected routes.
11. Role guards.
12. Resource-level authorization.

Test Guest, Creator, Business, wrong-role, wrong-owner, and unauthorized-private-data scenarios.

## Phase 3 — Profile Domains

### Creator

1. Onboarding.
2. Profile.
3. Edit.
4. Image upload.
5. Collaboration Email.
6. Instagram/YouTube.
7. Validation.
8. Public profile.

### Business

1. Onboarding.
2. Profile.
3. Edit.
4. Logo upload.
5. Optional website/Instagram.
6. Collaboration Email.
7. Creator-facing read-only Business Profile.

Test optional-data fallbacks.

## Phase 4 — Creator Discovery

Implement:

1. Creator listing.
2. Search.
3. Finalized filters.
4. Creator cards.
5. Profile navigation.
6. Save/Unsave.
7. Saved Creators.
8. Empty/loading/error states.

## Phase 5 — Inquiry Creation

Implement:

1. Send Inquiry.
2. Inquiry form.
3. Required validation.
4. Create API.
5. Duplicate active-inquiry protection.
6. Loading state.
7. Success state.
8. Failure/retry.

## Phase 6 — Inquiry State Machine

Implement atomic server-side transitions:

```text
PENDING → ACCEPTED
PENDING → REJECTED
PENDING → EXPIRED
participant unavailable → CLOSED
```

Test concurrent decisions and invalid transitions.

## Phase 7 — Business Inquiry Management

Implement:

1. My Inquiries.
2. All.
3. Pending.
4. Accepted.
5. Rejected.
6. Expired.
7. Closed/unavailable.
8. Inquiry Details.
9. Accepted contact access.
10. Instagram action.
11. Loading/empty/error states.

## Phase 8 — Creator Inquiry Management

Implement:

1. Received Inquiries.
2. Status filters.
3. Creator Inquiry Details.
4. Accept.
5. Reject.
6. Accepted state.
7. Rejected state.
8. Expired state.
9. Closed state.
10. Loading/empty/error states.

## Phase 9 — Post-Acceptance Contact Exchange

Implement:

1. Accepted relationship detection.
2. Authorized Creator email exposure.
3. Authorized Business email exposure where applicable.
4. Email action.
5. Instagram action.
6. Collaboration-confirmed messaging.
7. Business notification.
8. Creator notification.
9. Email-change notification.

Security tests:

```text
Pending → email hidden
Accepted → authorized email visible
Rejected → email hidden
Expired → email hidden
Unauthorized → email hidden
```

## Phase 10 — Notifications

Implement header notifications only:

1. New inquiry.
2. Accepted.
3. Rejected.
4. Expired.
5. Collaboration email updated.
6. Read/unread.
7. Resource navigation.

Do not create a dedicated notification center.

## Phase 11 — Settings & Account Lifecycle

Implement:

1. Settings.
2. Change Password.
3. Logout.
4. Delete Account.
5. Confirmation.
6. Session invalidation.
7. Soft deletion.
8. Inquiry closure/unavailability.

## Phase 12 — Global Edge-State System

Create reusable:

```text
Loading/Skeleton
EmptyState
ErrorState
InlineValidation
Toast/Alert
ConfirmationModal
Unauthorized/403
NotFound/404
SessionExpired
OfflineState
UploadError
```

Apply consistently.

## Phase 13 — Reliability & Concurrency

Test:

- Double-click Send Inquiry.
- Double-click Accept.
- Double-click Reject.
- Two simultaneous Accept requests.
- Accept + Reject concurrently.
- Stale inquiry tab.
- Browser refresh.
- Browser back.
- Network interruption during mutation.
- Reconnection.
- API timeout.
- API 500.
- API 401.
- API 403.
- API 404.
- Duplicate inquiry.
- Creator deletion during pending inquiry.
- Business deletion during pending inquiry.
- Email update after accepted collaboration.

## Phase 14 — Responsive & Accessibility

Audit every finalized screen for:

- Desktop.
- Tablet.
- Mobile.
- Keyboard navigation.
- Focus management.
- Form labels.
- Error accessibility.
- Status accessibility.
- Touch targets.
- Modal accessibility.

## Phase 15 — Security Audit

Verify:

1. Creator cannot access Business-only resources.
2. Business cannot access Creator-private resources.
3. Business A cannot access Business B data.
4. Creator A cannot access Creator B private inquiry data.
5. Collaboration Email is not returned before acceptance.
6. Collaboration Email is not returned for rejected/expired inquiries.
7. Accepted relationship is required for contact access.
8. Deleted users cannot perform new activity.
9. Client cannot force inquiry state transitions.
10. Duplicate requests cannot create duplicate inquiries.
11. Auth/session data is handled securely.
12. User-generated content is safely rendered.

## Phase 16 — Final End-to-End Acceptance Tests

### Business happy path

```text
Register Business
 → Verify email
 → Complete Business Profile
 → Business Dashboard
 → Discover Creators
 → View Creator
 → Save Creator
 → Send Inquiry
 → Pending
 → Creator accepts
 → Business notified
 → Creator email available
 → Email Creator
 → External collaboration
```

### Creator happy path

```text
Register Creator
 → Verify email
 → Complete Creator Profile
 → Creator Dashboard
 → Receive Inquiry
 → View Inquiry
 → Accept
 → Collaboration Confirmed
 → Business contact available
 → Email Business
 → External collaboration
```

### Rejection

```text
Pending → Creator rejects → Rejected → Business notified → No contact access
```

### Expiration

```text
Pending → 60 days with no response → Expired → Notification → No decision actions
```

### Account deletion

```text
Participant deletes account → account unavailable → affected active relationship Closed
→ no new activity → historical data handled according to retention/privacy rules
```

---

# Final Product Architecture Summary

```text
                         CREATOR CONNECT
                               │
               ┌───────────────┴───────────────┐
               │                               │
           BUSINESS                         CREATOR
               │                               │
          Discover                         Profile
               │                               │
       Creator Profile              Received Inquiries
               │                               │
        Save / Inquiry                    View Inquiry
               │                               │
               └──────────────┬────────────────┘
                              ↓
                           INQUIRY
                              ↓
                           PENDING
                         /    │     \
                        ↓     ↓      ↓
                   ACCEPTED REJECTED EXPIRED
                        │
                        ↓
              COLLABORATION CONFIRMED
                        │
                        ↓
              CONTROLLED CONTACT ACCESS
                        │
                  ┌─────┴─────┐
                  ↓           ↓
                EMAIL      INSTAGRAM
                  │           │
                  └─────┬─────┘
                        ↓
              EXTERNAL COLLABORATION
```

## Non-negotiable rules

1. Inquiry is the central transactional entity.
2. Do not introduce Campaign/Project concepts into the MVP.
3. Only one active inquiry exists between a Business and Creator at a time.
4. Rejected and Expired are different states.
5. Expired occurs after 60 days without a response.
6. Account unavailability is handled as Closed/unavailable, not Rejected.
7. Collaboration Email is private.
8. Contact access is relationship-based and begins after acceptance.
9. Email privacy is enforced server-side.
10. Email changes notify accepted counterparties.
11. Header notifications are sufficient for MVP.
12. External email/Instagram handles post-acceptance communication.
13. No in-app chat, payments, contracts, project management, deliverable management, or campaign workspace in MVP.
14. Backend is the source of truth for inquiry state.
15. Inquiry transitions are atomic and concurrency-safe.
16. Role and resource authorization are server-side requirements.
17. Loading, empty, validation, API-error, network-error, 401, 403, and 404 states are required.
18. Responsive behavior and accessibility are implementation requirements.
19. Soft account deletion is the initial recommendation to preserve relational integrity.
20. Do not add new product features merely because they seem useful; preserve the MVP boundary.

## Definition of Done

- [ ] Authentication complete.
- [ ] Email verification complete.
- [ ] Password recovery complete.
- [ ] Role-based redirect complete.
- [ ] Protected routes complete.
- [ ] Role authorization complete.
- [ ] Resource authorization complete.
- [ ] Creator onboarding complete.
- [ ] Business onboarding complete.
- [ ] Creator Profile complete.
- [ ] Business Profile complete.
- [ ] Public Creator Profile complete.
- [ ] Creator-facing Business Profile complete.
- [ ] Creator discovery complete.
- [ ] Save/Unsave Creator complete.
- [ ] Business My Inquiries complete.
- [ ] Creator Received Inquiries complete.
- [ ] Business Inquiry Details complete.
- [ ] Creator Inquiry Details complete.
- [ ] Accept/Reject transitions complete.
- [ ] 60-day expiration job complete.
- [ ] Account deletion/Closed behavior complete.
- [ ] Duplicate inquiry prevention complete.
- [ ] Concurrent transition protection complete.
- [ ] Collaboration email privacy complete.
- [ ] Collaboration email change notification complete.
- [ ] Post-acceptance contact exchange complete.
- [ ] Header notifications complete.
- [ ] Settings complete.
- [ ] Change Password complete.
- [ ] Delete Account complete.
- [ ] Loading/skeleton states complete.
- [ ] Empty states complete.
- [ ] Validation errors complete.
- [ ] API errors complete.
- [ ] Network/offline handling complete.
- [ ] Upload failures complete.
- [ ] 403 complete.
- [ ] 404 complete.
- [ ] Session Expired complete.
- [ ] Responsive behavior verified.
- [ ] Accessibility verified.
- [ ] Security/privacy audit passes.
- [ ] Business happy path passes.
- [ ] Creator happy path passes.
- [ ] Rejection path passes.
- [ ] Expiration path passes.
- [ ] Account deletion path passes.
- [ ] Concurrent inquiry tests pass.
- [ ] Duplicate submission tests pass.
- [ ] Private email access tests pass.
- [ ] No out-of-scope MVP features introduced unintentionally.

## Source-of-Truth Principle

When implementation details conflict with this document:

1. Preserve explicit product rules.
2. Preserve the Inquiry state machine.
3. Preserve privacy and authorization boundaries.
4. Preserve the MVP scope.
5. Prefer finalized UI where it satisfies this specification.
6. Do not infer a Campaign or Project domain from collaboration-brief terminology.
7. If a new requirement is introduced, update `REQUIREMENTS.md` before implementing it so this document remains the single source of truth.
