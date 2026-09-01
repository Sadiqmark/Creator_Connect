# Creator Connect — Implementation Control Plan

> **Purpose:** Final control layer between `REQUIREMENTS.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, and Gemini Anti-Gravity IDE implementation.
>
> - `REQUIREMENTS.md` = what the product must do.
> - `ARCHITECTURE.md` = how the system is built.
> - `DESIGN_SYSTEM.md` = how the product looks, feels, moves, and behaves.
> - This document = how Anti-Gravity must implement, validate, sequence, and govern changes.

## 1. Mission and Product Boundary

Creator Connect is a two-sided platform connecting **Businesses** with **Creators**. The core product story is:

```text
Discover → Understand → Connect → Collaborate
```

The operational flow is:

```text
Discover Creator
  ↓
Evaluate Profile
  ↓
Send Structured Inquiry
  ↓
Creator Reviews
  ↓
Accept / Reject
  ↓
Collaboration Confirmed
  ↓
Controlled Contact Exchange
  ↓
External Collaboration
```

Creator Connect owns discovery, profile evaluation, structured inquiries, decision tracking, notifications, and controlled contact exchange. It does not replace Instagram or email and does not become an in-app collaboration workspace.

### Explicit MVP exclusions

Do **not** implement:

- In-app chat or messaging
- Campaign management
- Project management
- Collaboration workspace
- Contracts
- Payments
- Invoices
- Earnings
- Deliverable tracking
- File sharing
- Content submission
- Content approval
- Campaign analytics
- Creator ratings
- Business ratings
- Dedicated/advanced notification center

After acceptance, actual collaboration happens externally, primarily through professional email and optionally Instagram.

---

## 2. Source-of-Truth and Change Governance

Anti-Gravity must read all four documents before implementation:

```text
REQUIREMENTS.md
ARCHITECTURE.md
DESIGN_SYSTEM.md
IMPLEMENTATION_CONTROL_PLAN.md
```

When instructions conflict, use this order:

1. Explicitly locked decisions from the latest project discussion/specification.
2. `REQUIREMENTS.md`.
3. `ARCHITECTURE.md`.
4. `DESIGN_SYSTEM.md`.
5. Existing working code that already satisfies the above.
6. AI/model preference only where the specifications are silent.

If a genuine conflict cannot be resolved:

```text
STOP → explain conflict → do not silently choose a new product rule → request review
```

Never silently change:

- technology stack
- inquiry states
- duplicate inquiry semantics
- account deletion semantics
- contact-email privacy
- post-acceptance scope
- MVP boundaries

---

## 3. Locked Technology Stack

### Frontend

| Concern | Locked choice |
|---|---|
| Language | TypeScript |
| UI | React |
| Build | Vite |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| Routing | React Router |
| Server state | TanStack Query |
| Forms | React Hook Form |
| Validation | Zod |
| Unit/component tests | Vitest + React Testing Library |
| E2E | Playwright |

### Backend

| Concern | Locked choice |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| HTTP framework | **Express.js** |
| API style | REST |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod or equivalent shared/server schema approach |
| API tests | Jest + Supertest or equivalent |
| Auth integration | Firebase Admin SDK |
| Storage integration | Firebase Admin/Storage SDK as appropriate |

### External services

- Firebase Authentication: authentication identity.
- Firebase Storage: Creator profile images and Business logos.
- Email service: adapter/interface; development must not depend on a paid provider.

### Absolute architecture decisions

```text
Express.js = LOCKED
NestJS = NOT ALLOWED

React + TypeScript + Vite = LOCKED
PostgreSQL = LOCKED
Prisma = LOCKED
Firebase Authentication = LOCKED
Firebase Storage = LOCKED
```

The MVP is a **modular monolith**, not microservices.

Do not introduce Redux or another global state framework just because it is familiar. Use TanStack Query for server state and local React state for local UI state.

---

## 4. Zero-Cost Development Constraint

Development should remain free or as close to zero-cost as practical.

Do not introduce a paid service when an adequate free/local development approach exists.

Email must be abstracted:

```text
EmailService
  ├── DevelopmentEmailService
  └── ProductionEmailService
```

Domain logic must not depend directly on a commercial provider.

---

## 5. Backend Architecture

All requests conceptually follow:

```text
HTTP Request
  ↓
Express Router
  ↓
Global Middleware
  ↓
Authentication
  ↓
Role / Resource / Relationship Authorization
  ↓
Validation
  ↓
Controller
  ↓
Service / Use Case
  ↓
Repository
  ↓
Prisma
  ↓
PostgreSQL
  ↓
Safe Response DTO
```

### Router

Own:

- HTTP method/path
- middleware composition
- controller binding

Do not put business logic in routers.

### Controller

Own:

- route parameters
- authenticated principal
- validated request data
- service invocation
- HTTP error mapping
- response DTO

Controllers must not directly execute Prisma queries, implement inquiry transitions, decide email privacy, implement authorization, or contain large business algorithms.

### Services

Expected services:

```text
AuthService
CreatorService
BusinessService
InquiryService
SavedCreatorService
NotificationService
AccountService
UploadService
```

`InquiryService` owns inquiry state-transition rules.

### Repositories

Expected repositories:

```text
UserRepository
CreatorRepository
BusinessRepository
InquiryRepository
SavedCreatorRepository
NotificationRepository
AuditEventRepository
```

Repositories isolate PostgreSQL/Prisma access and must not contain HTTP or UI logic.

---

## 6. Core Domain Terminology

Use these terms consistently:

```text
Business
Creator
Inquiry
Pending
Accepted
Rejected
Expired
Closed
Collaboration Email
Saved Creator
Notification
```

Do not create MVP entities named:

```text
Campaign
Project
Workspace
Chat
Payment
Contract
Deliverable Management
```

A collaboration brief belongs to an `Inquiry`; it does not create a Campaign or Project entity.

---

## 7. Inquiry State Machine — Non-Negotiable

The Inquiry is the central transactional entity.

```text
                         PENDING
                       /    |     \
                      ↓     ↓      ↓
                 ACCEPTED REJECTED EXPIRED

Participant/account unavailable:
active relationship → CLOSED
```

Valid decision transitions:

```text
PENDING → ACCEPTED
PENDING → REJECTED
PENDING → EXPIRED
```

`CLOSED` is an availability/lifecycle outcome, not a human rejection.

Meanings:

| State | Meaning |
|---|---|
| PENDING | Business sent inquiry; Creator has not responded |
| ACCEPTED | Creator explicitly accepted; collaboration is confirmed |
| REJECTED | Creator explicitly rejected |
| EXPIRED | No response for 60 days |
| CLOSED | Relationship cannot proceed because an involved account/resource is unavailable |

Never use `REJECTED` for expiration or account deletion.

Invalid transitions include:

```text
ACCEPTED → REJECTED
ACCEPTED → EXPIRED
REJECTED → ACCEPTED
EXPIRED → ACCEPTED
EXPIRED → REJECTED
```

The backend is the source of truth and must enforce transitions atomically.

---

## 8. Duplicate Inquiry Rule

Only one **active** inquiry may exist between a Business and Creator at a time.

Active states:

```text
PENDING
ACCEPTED
```

Therefore:

```text
PENDING  → block second inquiry
ACCEPTED → block another active inquiry
REJECTED → new inquiry allowed
EXPIRED  → new inquiry allowed
CLOSED   → new inquiry allowed when appropriate
```

If an active inquiry already exists, the UI should show:

```text
Inquiry Sent
[View Inquiry]
```

with contextual copy such as:

> You already have an active inquiry with this creator.

The UI is not the security mechanism. The application and database/concurrency layers must enforce the rule.

---

## 9. Concurrency and Idempotency

The system must remain correct across:

- double clicks
- browser retries
- network retries
- duplicate HTTP requests
- multiple tabs
- multiple devices

Example:

```text
Request A → Accept
Request B → Reject
```

Only one transition may succeed.

Use a conditional atomic transition or equivalent transaction:

```text
UPDATE inquiry
SET status = ACCEPTED
WHERE id = ?
  AND status = PENDING
```

Verify the affected-row count. If zero:

```text
already changed → 409/current-state conflict → refetch → render authoritative state
```

For Inquiry creation, combine:

```text
Application duplicate check
+
Database uniqueness/concurrency protection
```

For state changes, use conditional atomic updates/transactions.

---

## 10. Post-Acceptance Collaboration Workflow

This is the handoff from platform-managed inquiry to external collaboration.

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
Business collaboration contact becomes available to authorized Creator where applicable
  ↓
Email / Instagram
  ↓
External collaboration
```

### Business accepted state

Show:

- accepted status
- Creator identity
- Creator Collaboration Email
- Email Creator action
- Instagram action where available
- original inquiry details

### Creator accepted state

Show:

- collaboration confirmed
- Business identity
- Business notified message
- explicit indication that the Creator's Collaboration Email has been shared with the Business
- authorized Business contact where applicable
- Email Business action where authorized
- original inquiry details

Do not build an in-app chat or collaboration workspace.

---

## 11. Collaboration Email Privacy

Collaboration Email is private relationship data.

| Situation | Creator email | Business email |
|---|---:|---:|
| Public/guest profile | Hidden | Hidden/private |
| Before acceptance | Hidden | Not exposed |
| Pending inquiry | Hidden | Not exposed |
| Rejected inquiry | Hidden | Not exposed |
| Expired inquiry | Hidden | Not exposed |
| Accepted inquiry | Authorized participant only | Authorized participant only |
| Unauthorized user | Hidden | Hidden |

Never do this:

```text
API returns private email
  ↓
React hides it
```

Instead:

```text
Authenticate
  ↓
Authorize
  ↓
Check relationship
  ↓
Check inquiry state
  ↓
Build safe DTO
  ↓
Return only permitted fields
```

Public Creator, search, pending, rejected, expired, and unauthorized responses must not include Collaboration Email.

Accepted inquiry responses may include contact information only for authorized participants.

---

## 12. Collaboration Email Changes

When a Collaboration Email changes:

```text
Old email
  ↓
New email
  ↓
Validate/update
  ↓
Notify accepted counterparties
```

Only accepted counterparties receive the updated collaboration contact information.

Do not expose updated private email through public/search endpoints.

---

## 13. Account Deletion Policy

Use soft deletion initially:

```text
ACTIVE → DELETED
```

On deletion:

1. Confirm destructive action.
2. Invalidate active session/authentication access.
3. Mark account unavailable/deleted.
4. Prevent new activity.
5. Prevent new inquiries involving the unavailable account.
6. Identify affected active inquiries/relationships.
7. Mark affected relationships `CLOSED`/unavailable where collaboration cannot proceed.
8. Preserve appropriate historical inquiry records.
9. Protect/anonymize private data according to retention/privacy requirements.
10. Record the deletion event.
11. Create relevant notification/event where required.

Never convert account deletion into `REJECTED`.

```text
REJECTED = explicit human decision
EXPIRED  = no response for 60 days
CLOSED   = account/resource unavailable
```

---

## 14. 60-Day Expiration

A Pending inquiry expires 60 days after creation:

```text
created_at + 60 days
  ↓
still PENDING?
  ↓
EXPIRED
```

Set:

```text
expires_at = created_at + 60 days
```

Expiration belongs to the backend scheduled process, not the frontend.

The job must:

1. Find Pending inquiries whose expiration time has passed.
2. Atomically transition still-Pending records to Expired.
3. Create appropriate notification.
4. Record an audit event.
5. Leave Accepted/Rejected/Closed records unchanged.
6. Be safe to retry.

Expired inquiries cannot be accepted or rejected, do not grant contact access, and may be followed by a new inquiry later.

---

## 15. Authorization Model

Authorization has four practical checks:

```text
Authentication
  ↓
Role authorization
  ↓
Resource authorization
  ↓
Relationship authorization
```

### Authentication

Who is the user?

### Role authorization

```text
CREATOR
BUSINESS
```

Examples:

```text
Creator → Creator inquiry actions
Business → Inquiry creation
Business → Saved Creators
```

### Resource authorization

Examples:

```text
Business A → Business B inquiry → 403
Creator A → Creator B private inquiry → 403
```

### Relationship authorization

Private contact access requires:

```text
Authenticated participant
+
Correct relationship
+
Inquiry.status = ACCEPTED
```

Frontend guards improve UX but are never the security boundary. Backend authorization is mandatory.

---

## 16. Firebase Authentication

Use Firebase Authentication as the identity provider.

Conceptually:

```text
React
  ↓
Firebase Authentication
  ↓
Firebase ID token
  ↓
Express API
  ↓
Firebase Admin SDK verifies token
  ↓
Authenticated principal
  ↓
Application User lookup
```

The backend should resolve a principal similar to:

```ts
req.user = {
  id,
  firebaseUid,
  role,
  status
}
```

Never trust role information supplied by the browser.

Do not create a competing password-authentication system or store raw passwords in PostgreSQL.

---

## 17. Protected Routes and Session Expiry

Conceptual routes:

```text
Public
/
/login
/register
/verify-email
/forgot-password
/reset-password
/creators
/creators/:creatorId

Authenticated
/dashboard
/settings

Creator
/creator/dashboard
/creator/profile
/creator/inquiries
/creator/inquiries/:inquiryId
/creator/businesses/:businessId

Business
/business/dashboard
/business/creators
/business/creators/:creatorId
/business/saved
/business/inquiries
/business/inquiries/:inquiryId
/business/profile
```

Role redirects:

```text
CREATOR  → Creator Dashboard
BUSINESS → Business Dashboard
```

Wrong role:

```text
403 Forbidden
```

Session expiry:

```text
401
 ↓
invalidate session
 ↓
Session Expired
 ↓
Sign In Again
```

The finalized Session Expired UX uses:

```text
Your session has expired.

For your security, your session has expired.
Please sign in again to continue.

[Sign In Again] [Go to Home]
```

Where safe, preserve the original destination through re-authentication.

---

## 18. Domain Data Model

Core models:

```text
User
CreatorProfile
BusinessProfile
Inquiry
SavedCreator
Notification
AuditEvent
```

### User

```text
id
firebase_uid
email
role
status
created_at
updated_at
deleted_at
```

Roles:

```text
CREATOR
BUSINESS
```

Status:

```text
ACTIVE
DELETED
```

### CreatorProfile

```text
id
user_id
name
profile_photo_url
niche
location
bio
specialties
instagram_url
youtube_url
collaboration_email
created_at
updated_at
```

### BusinessProfile

```text
id
user_id
business_name
category
description
city
state_or_province
country
logo_url
website_url
instagram_url
collaboration_email
created_at
updated_at
```

Logo, website, and Instagram are optional.

### Inquiry

```text
id
business_id
creator_id
status
collaboration_type
platform
deliverables
timeline_start
timeline_end
brief
additional_requirements
created_at
updated_at
responded_at
expires_at
closed_at
```

### SavedCreator

```text
id
business_id
creator_id
created_at
```

Constraint:

```text
UNIQUE(business_id, creator_id)
```

### Notification

```text
id
user_id
type
reference_id
read_at
created_at
```

### AuditEvent

```text
id
event_type
actor_user_id
resource_type
resource_id
metadata
created_at
```

Do not store unnecessary private data in audit metadata. No user-facing audit page is required for MVP.

---

## 19. Database and Transaction Rules

Use PostgreSQL constraints for business invariants wherever appropriate.

Examples:

```text
User.firebase_uid UNIQUE
SavedCreator(business_id, creator_id) UNIQUE
Foreign keys
Inquiry indexes
```

Index inquiry queries around:

```text
business_id
creator_id
status
created_at
expires_at
```

Use one appropriately managed PrismaClient instance; do not instantiate one per request.

Multi-step mutations must use transactions.

Accept example:

```text
BEGIN
  verify PENDING
  transition ACCEPTED
  set responded_at
  create notification
  create audit event
COMMIT
```

On failure:

```text
ROLLBACK
```

For database-backed notifications in MVP, notification creation can be part of the same transaction as the domain state change. Do not hold a database transaction open while waiting for external email delivery.

---

## 20. API Conventions

Base path:

```text
/api/v1
```

### Auth

```text
POST /api/v1/auth/register
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Firebase handles authentication-specific verification/password-recovery operations according to the integration.

### Creators

```text
GET   /api/v1/creators
GET   /api/v1/creators/:creatorId
GET   /api/v1/creators/me
PATCH /api/v1/creators/me
```

### Businesses

```text
GET   /api/v1/businesses/me
PATCH /api/v1/businesses/me
```

### Saved Creators

```text
GET    /api/v1/saved-creators
POST   /api/v1/saved-creators/:creatorId
DELETE /api/v1/saved-creators/:creatorId
```

Business-only.

### Inquiries

```text
POST /api/v1/inquiries
GET  /api/v1/inquiries
GET  /api/v1/inquiries/:inquiryId
POST /api/v1/inquiries/:inquiryId/accept
POST /api/v1/inquiries/:inquiryId/reject
```

`GET /inquiries` must be scoped by authenticated ownership:

```text
Business → inquiries they sent
Creator  → inquiries they received
```

Never let a client-supplied user ID bypass ownership.

### Notifications

```text
GET  /api/v1/notifications
POST /api/v1/notifications/:notificationId/read
```

Only the notification owner may access/modify their notifications.

---

## 21. API Error Contract

Use a consistent error shape:

```json
{
  "error": {
    "code": "INQUIRY_STATE_CONFLICT",
    "message": "The inquiry is no longer pending.",
    "requestId": "..."
  }
}
```

Semantic statuses:

| Status | Meaning |
|---|---|
| 200 | Successful read/update/action |
| 201 | Resource created |
| 204 | Successful operation with no body |
| 400 | Malformed request |
| 401 | Authentication/session problem |
| 403 | Authenticated but unauthorized |
| 404 | Resource/page does not exist |
| 409 | Duplicate/state/concurrency conflict |
| 422 | Validation failure |
| 429 | Rate limit |
| 500 | Unexpected server error |
| 503 | Service unavailable |

Never return fake `200` success for failed operations.

Never expose stack traces, SQL/Prisma errors, tokens, passwords, or infrastructure details.

---

## 22. DTO and Serialization Rules

Never return raw Prisma entities by default.

Use safe DTOs such as:

```text
CreatorPublicDTO
CreatorPrivateDTO
InquiryBusinessDTO
InquiryCreatorDTO
InquiryAcceptedDTO
BusinessPublicDTO
```

The Prisma model may contain `collaborationEmail`; public DTOs must explicitly exclude it.

Privacy must be enforced at serialization/API boundaries, not only in React.

---

## 23. Frontend State Architecture

Use TanStack Query for server state:

```text
Creators
Creator Profiles
Business Profiles
Inquiries
Saved Creators
Notifications
```

Use local React state for:

- modal state
- temporary UI state
- form interaction
- presentation state

Do not put every server response into a global store.

After mutation:

```text
Mutation success
  ↓
use returned authoritative data
OR
invalidate/refetch
  ↓
UI reconciles
```

Do not allow stale local state to override the server.

Avoid optimistic Accept/Reject. Use:

```text
Click Accept → Accepting... → server confirms → Accepted
```

Simple Save/Unsave can be optimistic only with reliable rollback.

---

## 24. Form and Validation Rules

Use:

```text
React Hook Form + Zod
```

Flow:

```text
User input
  ↓
Client validation
  ↓
API request
  ↓
Server validation
  ↓
Service
  ↓
Database
```

Validate:

- required fields
- email format
- Instagram/YouTube/website URL format
- image type
- image size
- image validity
- inquiry fields
- timeline/date validity
- password requirements

Client validation is UX; server validation is authoritative.

Validation errors must identify the field, explain the correction, and preserve valid input where practical.

---

## 25. File Upload Rules

Used for Creator profile photos and Business logos.

```text
Select
 ↓
Validate
 ↓
Uploading...
 ↓
Firebase Storage
 ↓
Profile update
 ↓
Success
```

Do not store image binaries in PostgreSQL.

Validate type, size, and image validity.

Failure:

```text
Upload failed. Please try again.
```

A missing Business logo is valid and must use the polished initials/typographic fallback. Never show a broken image icon.

Firebase Admin credentials/private keys must never be committed.

---

## 26. Product Feature Implementation Rules

### Creator onboarding/profile

Required:

- profile photo
- creator name
- primary niche
- location
- bio
- content specialties
- Instagram
- YouTube
- Collaboration Email

Public Creator profile must never expose Collaboration Email.

Existing Creators missing Collaboration Email should be prompted to complete it before accepting a new inquiry, without unnecessarily blocking unrelated application usage.

### Business onboarding/profile

Required:

- business name
- category
- description
- city
- state/province
- country
- collaboration/contact email

Optional:

- logo
- website
- Instagram

Local businesses without a logo, website, or Instagram remain valid.

Creator-facing Business Profile is read-only and exists so Creators can understand who is behind an inquiry.

Do not add Campaign listings, maps/statistics, Save Business, or other out-of-scope features to it.

### Business Dashboard

Must provide access to:

- saved creators
- total inquiries
- pending
- accepted
- rejected
- recent inquiries
- recently saved creators
- discover/find creators
- relevant empty states

Discovery remains the primary action.

### Creator Dashboard

Must provide access to:

- profile
- received inquiries
- pending/accepted/rejected/expired information as appropriate
- settings

Do not show Business-only navigation.

### Creator Discovery

Business flow:

```text
Dashboard → Discover Creators → Search/Filter → Creator Card → Creator Profile → Save / Inquiry
```

Required states:

- loading/skeleton
- no results
- API failure
- network failure
- Creator/resource not found
- rapid-search stale-response protection

### Saved Creators

Business-only. Prevent duplicate saved relationships. Keep saved state consistent across cards/profile/list.

### Business My Inquiries

Finalized concepts:

- All
- Pending
- Accepted
- Rejected
- Expired where relevant
- Closed where relevant
- Creator
- collaboration information
- sent date
- status
- View

### Creator Received Inquiries

This screen is already finalized. Do not redesign its product behavior.

### Inquiry Details

Business and Creator details must show the appropriate:

- participant identity
- collaboration type
- deliverables
- timeline
- brief
- additional information
- current status

Pending:

```text
waiting for Creator response
```

Accepted:

```text
collaboration confirmed
+ authorized contact
+ external communication actions
```

Rejected:

```text
rejected
+ no contact access
```

Expired:

```text
no response within 60 days
+ no decision actions
+ no contact access
```

Closed:

```text
participant/resource unavailable
+ no decision actions
+ no contact access
```

Creator Inquiry Detail and Creator Accept Inquiry interaction are already finalized.

---

## 27. Notifications

MVP decision:

```text
Header notifications only
```

Do not create a dedicated notification center.

Required events:

```text
INQUIRY_RECEIVED
INQUIRY_ACCEPTED
INQUIRY_REJECTED
INQUIRY_EXPIRED
COLLABORATION_EMAIL_UPDATED
```

Notifications are generated from real backend/domain events.

Required behavior:

- list notifications
- read/unread state
- mark read
- resource navigation
- owner-only access
- retry-safe creation

Read/unread changes must never mutate inquiry state.

---

## 28. Edge-State Architecture

Every major data-driven screen must account for:

```text
Default
Loading
Empty
Error
Success where relevant
Disabled/Unavailable where relevant
Submitting
Conflict/Stale
Network failure
Mobile
Desktop
```

Reusable components should include:

```text
Loading/Skeleton
EmptyState
ErrorState
InlineValidation
Toast/Alert
ConfirmationModal
Forbidden/403
NotFound/404
SessionExpired
OfflineState
UploadError
```

### Loading

Use layout-matching skeletons:

```text
DashboardSkeleton
CreatorGridSkeleton
CreatorProfileSkeleton
BusinessProfileSkeleton
InquiryListSkeleton
InquiryDetailsSkeleton
```

Mutation labels:

```text
Sending...
Accepting...
Rejecting...
Saving...
Uploading...
Updating...
Deleting...
```

Disable the relevant action while submitting.

### Empty

Examples:

```text
No saved creators
No inquiries
No received inquiries
No search results
No filtered inquiries
```

Empty is not an error and should explain what happened plus the next action where useful.

### API/network errors

Reads:

```text
Loading → Error → Try Again
```

Writes:

```text
Idle → Submitting → Failure → Retry
```

Never show success without server confirmation.

### 403

Finalized concept:

```text
Access denied.
You don't have permission to access this page.

[Go to Dashboard] [Go Back]
```

### 404

Finalized concept:

```text
404
Page not found
The page/resource doesn't exist or may have been removed.

[Go to Dashboard] [Go Back]
```

Do not reveal sensitive resource information.

---

## 29. Stale State, Refresh, Back, and Offline Rules

### Stale inquiry

```text
Tab A: Pending
Tab B: Creator accepts
Tab A: user acts
  ↓
409/current-state conflict
  ↓
refetch
  ↓
render Accepted
```

### Browser refresh

Protected pages must reconstruct critical state from:

```text
Authentication state
Server state
Route parameters
```

Do not depend on volatile React memory for critical business state.

### Browser back

When returning to an inquiry:

- revalidate stale server state where appropriate
- do not resurrect old action buttons
- respect current authorization
- respect current inquiry state

### Offline/reconnection

Never fake mutation success.

Show offline/retry feedback.

After reconnection:

- revalidate relevant state
- reconcile stale data
- do not blindly replay mutations unless idempotency makes it safe

---

## 30. Performance Rules

No concrete numeric production SLA has been locked. Do not invent one and claim it is an existing requirement. Establish measurable budgets during deployment planning.

Required principles:

- paginate large lists
- lazy-load non-critical routes where useful
- avoid loading irrelevant role-specific modules
- cache safe read-heavy data
- optimize images
- prevent duplicate requests
- avoid N+1 database access
- use TanStack Query effectively
- index inquiry participant/status/time queries
- revalidate inquiry state after mutations
- avoid unnecessary global state updates

Good cache candidates:

```text
Creator discovery
Public profiles
Static metadata
```

Handle carefully:

```text
Inquiry status
Authorization-sensitive data
Collaboration emails
Account status
```

---

## 31. Security and Input Safety

All user input is untrusted.

Apply:

- schema validation
- type validation
- URL validation
- email validation
- length limits
- file restrictions
- safe rendering/escaping
- parameterized database access through Prisma

Do not construct raw SQL from user input.

Use server-side authorization for:

```text
Authentication
Role
Resource ownership
Relationship access
Inquiry state transition
Private data visibility
```

Never log:

- passwords
- auth secrets
- Firebase private keys
- raw session tokens
- unnecessary Collaboration Email data

Use structured logging with request ID, route, status, duration, error code, and safe resource/user identifiers as appropriate.

---

## 32. Design Governance

The finalized Stitch designs are reference material for the UI. Preserve finalized product behavior, required information, and user actions. Improve visual hierarchy, spacing, typography, motion, responsive behavior, accessibility, and feedback where needed.

The design direction is:

```text
Instagram-inspired visual discovery
+
premium creator portfolio
+
editorial web design
+
collaboration marketplace UX
```

It must feel:

```text
Creator-first
Visual
Premium
Editorial
Socially familiar
Human
Confident
Modern
Simple without feeling generic
```

It must not feel like:

```text
Generic SaaS dashboard
AI-generated UI template
Corporate admin panel
Instagram clone
Card-heavy startup template
```

### Instagram inspiration

Use for:

- visual discovery
- strong profile identity
- image-first presentation
- profile hierarchy
- media grids
- save/favorite interaction
- lightweight notifications
- familiar social navigation

Do not copy Instagram branding, exact colors, logo, exact layout, or proprietary UI.

### Siteinspire inspiration

Use for:

- minimal layouts
- portfolio presentation
- photography
- grid layouts
- typography
- art direction
- interactive motion
- occasional unusual layouts

Do not copy a Siteinspire website.

---

## 33. Visual System Rules

Use a restrained warm-neutral foundation with one distinctive accent. Do not use generic purple/blue SaaS palettes or Instagram's exact gradient.

Initial tokens:

```css
:root {
  --background: #FAF9F6;
  --surface: #FFFFFF;
  --surface-muted: #F3F1EC;

  --foreground: #111111;
  --foreground-muted: #686868;
  --foreground-subtle: #929292;

  --border: #E5E2DB;
  --border-strong: #CCC8BE;

  --accent: #E85D4A;
  --accent-foreground: #FFFFFF;

  --success: #2E7D5B;
  --warning: #B7791F;
  --danger: #C83C3C;
}
```

Centralize colors, typography, spacing, radius, shadows, motion, and breakpoints. Do not scatter arbitrary visual values.

Typography:

- distinctive editorial serif/display face for major marketing moments
- clean modern sans-serif for navigation, forms, buttons, metadata, body, and dense UI

Layout:

```text
Full-width page
  ↓
Content max-width ~1200–1440px
  ↓
Intentional sections
  ↓
Whitespace
  ↓
Visual hierarchy
```

Grid:

```text
Desktop: 12 columns
Tablet:   8 columns
Mobile:   4 columns
```

Avoid excessive rounding. Suggested:

```text
Input: 8px
Button: 8px
Dialog: 12px
Card: 12px where needed
Avatar: 50%
```

Pills are for tags, status, categories, and compact filters.

---

## 34. Visual Anti-AI Rules

Never automatically introduce:

```text
Purple/blue SaaS gradients
Huge rounded cards
Glassmorphism
Excessive shadows
Floating gradient blobs
Generic dashboard illustrations
Random decorative icons
Three-card metric layouts everywhere
Excessive pill buttons
Huge hero gradients
AI-style glowing backgrounds
```

Content should provide visual energy through creator imagery, typography, whitespace, grids, and editorial composition.

Discovery should feel visual rather than CRM-like.

Creator imagery should feel real, authentic, professional, diverse, and Indian-market relevant. Do not imply sample people are actual platform users.

Do not invent metrics such as engagement rate, pricing, revenue, campaign performance, verification status, or reviews unless the product actually stores them.

---

## 35. Motion Rules

Motion is required but subtle.

Suggested durations:

```text
Micro interaction: 120–180ms
Hover/button:      150–200ms
Modal/panel:       200–300ms
Page transition:   200–350ms
```

Use motion for:

- button loading
- hover feedback
- save interaction
- modal entrance
- dropdown opening
- toast appearance
- skeletons
- filter changes

Good examples:

```text
Creator card hover → image scale 1.01–1.03
Button hover → subtle color/elevation transition
Save → small scale/opacity transition
Inquiry → Send → Sending... → Sent
Modal → opacity + small translate/scale
```

Avoid:

- parallax
- bouncing buttons
- spinning decoration
- animated gradients everywhere
- cursor-following effects
- heavy 3D
- long transitions
- interaction-blocking animation

Respect `prefers-reduced-motion`.

---

## 36. Accessibility and Responsive Rules

Required:

- semantic HTML
- keyboard navigation
- visible focus
- proper labels
- accessible dialogs/dropdowns
- screen-reader-friendly status
- meaningful alt text
- sufficient contrast
- reduced motion
- no color-only status communication
- adequate touch targets
- error association
- focus management

Responsive behavior uses the same data, domain logic, and components where practical.

### Desktop

- multi-column visual grids
- hover interactions
- spacious layouts

### Tablet

- reduced columns
- reduced spacing
- responsive typography

### Mobile

- single/compact grid
- thumb-friendly actions
- simple navigation
- readable inquiry details
- primary actions easy to reach

Critical actions must remain usable:

```text
Accept
Reject
Send Inquiry
Save
Retry
Sign In Again
```

Destructive actions must not be too easy to trigger accidentally.

---

## 37. Shared Components

Generic UI:

```text
Button
Input
Textarea
Select
Badge
StatusBadge
Avatar
Image
Dialog
Dropdown
Toast
Alert
Skeleton
EmptyState
ErrorState
Tabs
Tooltip
Navigation
SearchInput
FilterChip
Pagination
ConfirmationModal
```

Domain components:

```text
CreatorCard
CreatorProfile
BusinessProfile
InquiryCard
InquiryDetails
InquiryStatus
InquiryForm
NotificationMenu
```

Do not put domain business logic into generic UI components.

---

## 38. Finalized Screen Inventory

Anti-Gravity must map the implementation to this inventory before building.

### Authentication

```text
Landing / Role Selection
Login
Registration
Email Verification
Forgot Password
Reset Password
Session Expired
```

### Authorization

```text
403 Access Denied
404 Page Not Found
Role-based redirect
Protected-route behavior
```

### Business

```text
Business Dashboard
Business Profile Setup
Business Profile Edit
Business Profile View
Creator Discovery
Public Creator Profile
Saved Creators
My Inquiries
Business Inquiry Details
Settings
Change Password
Delete Account
```

### Creator

```text
Creator Dashboard
Creator Profile Setup
Creator Profile Edit
Public Creator Profile
Received Inquiries
Creator Inquiry Details
Accept Inquiry
Reject Inquiry
Accepted Collaboration Contact State
Creator-facing Business Profile
Settings
```

### Edge states

```text
Loading/Skeleton
Empty
Validation
API Error
Network Error
Upload Error
Success
403
404
Session Expired
Conflict/Stale
```

Not every edge state requires a separate page.

---

## 39. Stitch Screen Review Gate

For every screen:

```text
Product requirement
  ↓
Existing flow check
  ↓
Stitch reference
  ↓
Visual implementation
  ↓
Responsive behavior
  ↓
Interaction states
  ↓
Loading / Empty / Error / Success
  ↓
Accessibility
  ↓
Motion
  ↓
Privacy/security review
  ↓
Implementation
```

A screen is accepted only when it:

```text
[ ] follows Creator Connect visual language
[ ] is not generic SaaS
[ ] does not copy Instagram
[ ] uses shared colors and typography
[ ] uses consistent spacing
[ ] uses cards intentionally
[ ] gives creator imagery appropriate priority
[ ] makes the primary action obvious
[ ] has relevant loading state
[ ] has relevant empty state
[ ] has error state
[ ] has success state where relevant
[ ] works on mobile
[ ] supports keyboard/focus
[ ] uses subtle motion
[ ] respects reduced motion
[ ] does not expose private information
[ ] feels intentionally designed rather than AI-generated
```

If a visual reference conflicts with a product/security requirement, preserve the product/security behavior and flag the visual conflict.

---

## 40. Phase-by-Phase Implementation Plan

Anti-Gravity must implement one dependency-safe phase at a time. Do not generate the entire application in one pass.

### Phase 0 — Repository Audit

Before coding:

- inspect repository
- identify framework/build system
- identify routing
- identify authentication/session
- identify state/server-state architecture
- identify API architecture
- identify database/data models
- identify design system/components
- identify existing domain code
- map finalized screens
- identify dependencies/setup gaps
- identify risks

Output:

```text
Current architecture
Current feature inventory
Requirements gap analysis
Architecture gap analysis
Design gap analysis
Dependency/setup gaps
Risks
Recommended implementation order
```

If the repository is greenfield, explicitly state that rather than pretending existing functionality exists.

### Phase 1 — Project Foundation

Implement/verify:

- repository structure
- Vite/React/TypeScript
- Express/TypeScript
- shared configuration
- linting/formatting
- test setup
- `.env.example`
- API base configuration
- error conventions
- request ID infrastructure
- basic application shell
- backend health endpoint

Gate:

```text
Frontend starts
Backend starts
TypeScript passes
Lint passes
Tests execute
Environment setup documented
```

### Phase 2 — Database + Prisma

Implement:

- PostgreSQL connection
- Prisma schema
- migrations
- Prisma client
- core models
- constraints
- indexes
- seed strategy

Gate:

```text
Migration works
Seed works
Constraints work
Prisma client works
Database tests pass
```

### Phase 3 — Firebase Authentication

Implement:

- registration
- login
- logout
- email verification
- forgot password
- reset password
- authenticated principal
- application User synchronization
- `/auth/me`
- session expiry

Gate:

```text
Creator authentication works
Business authentication works
Unauthenticated access is blocked
Session expiry works
```

### Phase 4 — Authorization Foundation

Implement:

- auth middleware
- role middleware
- resource authorization
- relationship authorization
- protected frontend routes
- role redirects
- 403
- 404

Gate:

```text
Wrong role → 403
Wrong owner → 403
Private resource → protected
Public resource → accessible
```

### Phase 5 — Application Shell + Design System

Implement:

- design tokens
- typography
- spacing
- buttons
- inputs
- badges
- dialogs
- dropdowns
- toasts
- skeletons
- empty/error states
- navigation
- responsive shell
- accessibility foundations
- subtle motion

Do not create unrelated visual systems screen-by-screen.

### Phase 6 — Creator Profile Domain

Implement:

- onboarding
- profile
- edit
- profile photo upload
- Collaboration Email
- Instagram
- YouTube
- validation
- public profile DTO
- privacy-safe serialization

Gate:

```text
Public profile works
Private email remains hidden
Creator can edit
Upload failure is recoverable
```

### Phase 7 — Business Profile Domain

Implement:

- onboarding
- profile
- edit
- logo upload
- initials fallback
- optional website
- optional Instagram
- Collaboration Email
- Creator-facing Business Profile

Gate:

```text
No logo works
No website works
No Instagram works
Creator can understand Business identity
Private contact remains protected
```

### Phase 8 — Creator Discovery + Saved Creators

Implement:

- Creator listing
- search
- finalized filters
- visual Creator Cards
- public Creator Profile
- Save/Unsave
- Saved Creators
- loading/empty/error/network states
- stale-search protection

Gate:

```text
Discovery works
Save uniqueness works
Empty state works
Search race conditions handled
```

### Phase 9 — Inquiry Creation

Implement:

- Send Inquiry
- Inquiry Form
- validation
- POST API
- active duplicate protection
- action loading
- success
- failure/retry
- Creator notification
- AuditEvent
- expiration timestamp

Gate:

```text
Valid inquiry → PENDING
Duplicate active inquiry → blocked
Double submit → no duplicate
Failure → no false success
```

### Phase 10 — Inquiry State Machine

Implement centrally:

```text
PENDING → ACCEPTED
PENDING → REJECTED
PENDING → EXPIRED
participant unavailable → CLOSED
```

Use atomic, concurrency-safe transitions.

Gate:

```text
Accept + Reject concurrency passes
Invalid transitions fail
Current state is returned
```

### Phase 11 — Business Inquiry Management

Implement:

- My Inquiries
- All
- Pending
- Accepted
- Rejected
- Expired
- Closed
- Inquiry Details
- accepted contact access
- Instagram action
- loading/empty/error states

### Phase 12 — Creator Inquiry Management

Implement:

- Received Inquiries
- status filters
- Creator Inquiry Details
- Accept
- Reject
- Accepted state
- Rejected state
- Expired state
- Closed state
- loading/empty/error states

Creator Received Inquiries and Creator Inquiry Detail are finalized product designs. Do not redesign their product behavior.

### Phase 13 — Post-Acceptance Contact Exchange

Implement:

- accepted relationship detection
- authorized Creator email exposure
- authorized Business contact exposure where applicable
- Email action
- Instagram action
- collaboration-confirmed messaging
- Business notification
- Creator notification
- email-change notification
- privacy-safe DTOs

Mandatory security checks:

```text
Pending      → email hidden
Accepted     → authorized email visible
Rejected     → email hidden
Expired      → email hidden
Closed       → email hidden
Unauthorized → email hidden
```

### Phase 14 — Notifications

Implement header notifications only:

- New inquiry
- Accepted
- Rejected
- Expired
- Collaboration Email updated
- read/unread
- resource navigation
- duplicate-event protection

Do not build a notification center.

### Phase 15 — Settings + Account Lifecycle

Implement:

- Settings
- Change Password
- Logout
- Delete Account
- confirmation
- session invalidation
- soft deletion
- inquiry closure/unavailability

Gate:

```text
Deleted user cannot perform active operations
Affected active relationships become Closed where required
```

### Phase 16 — Global Edge-State System

Apply reusable:

```text
Loading/Skeleton
EmptyState
ErrorState
InlineValidation
Toast/Alert
ConfirmationModal
403
404
SessionExpired
OfflineState
UploadError
Conflict/Stale
```

Verify every applicable screen.

### Phase 17 — Reliability + Concurrency

Execute the full reliability matrix:

```text
Double-click Send Inquiry
Double-click Accept
Double-click Reject
Two simultaneous Accept requests
Accept + Reject concurrently
Stale inquiry tab
Browser refresh
Browser back
Network interruption during mutation
Reconnection
API timeout
API 500
API 401
API 403
API 404
Duplicate inquiry
Creator deletion during pending inquiry
Business deletion during pending inquiry
Email update after accepted collaboration
```

### Phase 18 — Responsive + Accessibility

Audit all screens for:

- desktop
- tablet
- mobile
- keyboard navigation
- focus management
- labels
- error accessibility
- status accessibility
- touch targets
- modal accessibility
- reduced motion

### Phase 19 — Security Audit

Verify:

1. Creator cannot access Business-only resources.
2. Business cannot access Creator-private resources.
3. Business A cannot access Business B data.
4. Creator A cannot access Creator B private inquiry data.
5. Collaboration Email is not returned before acceptance.
6. Collaboration Email is not returned for rejected/expired/closed relationships.
7. Accepted relationship is required for contact access.
8. Deleted users cannot perform new activity.
9. Client cannot force inquiry state transitions.
10. Duplicate requests cannot create duplicate active inquiries.
11. Authentication/session data is secure.
12. User-generated content is safely rendered.

### Phase 20 — Final E2E Acceptance

Run:

- Business happy path
- Creator happy path
- Rejection
- Expiration
- Account deletion
- Duplicate inquiry
- Concurrency
- Email privacy
- Session expiry
- 403
- 404
- network failure
- upload failure
- responsive checks
- accessibility checks

---

## 41. Testing Architecture

### Unit tests

Must cover:

- inquiry state transitions
- duplicate inquiry policy
- authorization policies
- relationship/contact-email visibility
- expiration logic
- validation
- service behavior
- account deletion policy

### API/integration tests

Must cover:

- authentication middleware
- role guards
- resource authorization
- relationship authorization
- inquiry endpoints
- database interactions
- notification creation
- DTO/privacy serialization

### E2E tests

Use Playwright for critical user journeys.

No critical domain feature is complete without appropriate automated tests.

---

## 42. Phase Definition of Done

Every phase is complete only when:

```text
Implementation
+
Tests
+
Type checking
+
Linting
+
Relevant edge states
+
Security review
+
Responsive review where UI changed
+
Accessibility review where UI changed
+
No scope expansion
```

After each meaningful phase, Anti-Gravity must report:

```text
What changed
Why it changed
Files changed
Tests added
Tests executed
Known limitations
Security considerations
Next phase
```

Do not report only `Done`.

---

## 43. AI-Agent Stop Conditions

Anti-Gravity must stop and request review if:

1. A requirements conflict cannot be resolved.
2. A database change alters a locked domain invariant.
3. A proposed feature requires a new MVP domain entity.
4. A privacy rule cannot be implemented safely.
5. A security requirement conflicts with a visual requirement.
6. A dependency requires paid infrastructure contrary to the development constraint.
7. A new framework is proposed.
8. A major architectural rewrite appears necessary.
9. Existing working functionality would need to be deleted.
10. An inquiry state-machine change is proposed.
11. Account deletion semantics would change.
12. Duplicate inquiry semantics would change.
13. Post-acceptance communication scope would change.
14. The AI believes a requirement is incorrect but cannot safely reconcile it.

---

## 44. AI-Agent Non-Negotiable Rules

Anti-Gravity must:

- read the four control/specification documents first
- inspect the repository before changing code
- preserve working functionality that satisfies the specification
- use Express.js, not NestJS
- use TypeScript
- use React + Vite
- use Prisma + PostgreSQL
- use Firebase Authentication
- use Firebase Storage
- use TanStack Query for server state
- use React Hook Form + Zod for forms
- enforce authorization server-side
- treat PostgreSQL/server state as authoritative
- centralize inquiry state transitions
- keep controllers thin
- keep business logic in services
- isolate database access
- use safe response DTOs
- add tests alongside important domain logic
- implement one dependency-safe phase at a time
- run tests/type checks/lint after each meaningful phase
- preserve accessibility and responsive behavior
- use finalized Stitch designs as visual references
- preserve product behavior even when improving the visual design

Anti-Gravity must not:

- replace Express with NestJS
- introduce Redux without explicit approval
- replace the locked stack
- introduce microservices
- add chat
- add payments
- add contracts
- add Campaign/Project entities
- add a collaboration workspace
- add a notification center
- expose private Collaboration Email
- rely on frontend-only authorization
- rely on frontend-only inquiry state
- show false mutation success
- commit secrets
- silently alter domain semantics
- silently expand MVP scope
- delete working functionality without explicit justification

---

## 45. Final Product Architecture

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
                         /      |      \
                        ↓       ↓       ↓
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

The complete product story is:

> **Discover → Understand → Connect → Collaborate**

---

## 46. Final Release Gate

Creator Connect MVP is ready only when all applicable items pass:

```text
[ ] Authentication works
[ ] Email verification works
[ ] Password recovery works
[ ] Session expiry works
[ ] Role redirect works
[ ] Protected routes work
[ ] 403 works
[ ] 404 works

[ ] Creator onboarding works
[ ] Creator profile works
[ ] Business onboarding works
[ ] Business profile works
[ ] Local-business fallback works

[ ] Creator discovery works
[ ] Search/filter works
[ ] Save/Unsave works

[ ] Inquiry creation works
[ ] Duplicate inquiry protection works
[ ] Pending works
[ ] Accept works
[ ] Reject works
[ ] Expiration works
[ ] Closed/unavailable lifecycle works
[ ] Concurrent transitions are safe

[ ] Business inquiry management works
[ ] Creator inquiry management works

[ ] Collaboration Email privacy works
[ ] Accepted contact exchange works
[ ] Email-change notifications work
[ ] Instagram external action works

[ ] Header notifications work
[ ] Settings work
[ ] Change Password works
[ ] Delete Account works

[ ] Loading states work
[ ] Empty states work
[ ] Validation states work
[ ] API error states work
[ ] Network states work
[ ] Upload failure states work
[ ] Conflict/stale states work

[ ] Responsive audit passes
[ ] Accessibility audit passes
[ ] Security audit passes
[ ] Unit tests pass
[ ] API tests pass
[ ] E2E tests pass

[ ] No private email leaks
[ ] No unauthorized resource access
[ ] No duplicate active inquiries
[ ] No invalid inquiry transitions
[ ] No false mutation success
[ ] No out-of-scope MVP feature introduced unintentionally
```

---

## 47. Final Instruction to Gemini Anti-Gravity

Do not attempt to maximize generated code. Optimize for a **small, correct, secure, maintainable, testable, visually distinctive MVP**.

The correct workflow is:

```text
Read specifications
  ↓
Inspect current repository
  ↓
Plan current phase
  ↓
Implement current phase
  ↓
Test
  ↓
Audit against requirements
  ↓
Report
  ↓
Only then proceed to next phase
```

The AI must preserve the locked product, architecture, security, privacy, UX, and design decisions throughout implementation.

**End of Implementation Control Plan.**
