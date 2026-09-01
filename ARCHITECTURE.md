# Creator Connect — Technical Architecture Specification

> **Document:** `ARCHITECTURE.md`  
> **Project:** Creator Connect  
> **Status:** Implementation architecture for MVP  
> **Primary implementation environment:** Gemini Anti-Gravity IDE
>
> This document defines **how Creator Connect must be built**. `REQUIREMENTS.md` defines **what the system must do**. Both documents are required context for implementation.
>
> **Locked backend decision:** Node.js + TypeScript + Express.js. Do not replace Express with NestJS.
>
> **Locked frontend decision:** React + TypeScript + Vite.
>
> **Locked database decision:** PostgreSQL.
>
> **Locked ORM decision:** Prisma.
>
> **Locked authentication decision:** Firebase Authentication.
>
> **Locked file-storage decision:** Firebase Storage.
>
> The implementation must preserve the MVP scope and domain rules in `REQUIREMENTS.md`.

---

# 1. Architecture Goals

Creator Connect is a two-sided application connecting Businesses and Creators.

The architecture must prioritize:

1. Clear domain boundaries.
2. Strong server-side authorization.
3. Server-enforced inquiry state transitions.
4. Private collaboration-email protection.
5. Concurrency safety.
6. Type safety.
7. Testability.
8. Reusable frontend UI/state patterns.
9. Simple deployment and zero-cost development where possible.
10. AI-IDE-friendly project structure.
11. Ability to evolve without prematurely introducing microservices or unnecessary infrastructure.

The MVP should be implemented as a **modular monolith**, not as microservices.

---

# 2. Technology Stack

## 2.1 Frontend

| Concern | Technology |
|---|---|
| Language | TypeScript |
| UI framework | React |
| Build tool | Vite |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| Routing | React Router |
| Server state | TanStack Query |
| Forms | React Hook Form |
| Schema validation | Zod |
| Testing | Vitest + React Testing Library |
| E2E | Playwright |

## 2.2 Backend

| Concern | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| HTTP framework | Express.js |
| API style | REST |
| Validation | Zod or equivalent shared/server schema approach |
| ORM | Prisma |
| Database | PostgreSQL |
| Testing | Jest + Supertest or equivalent |
| Authentication integration | Firebase Admin SDK |
| File storage integration | Firebase Admin/Storage SDK as appropriate |

## 2.3 External services

### Firebase Authentication

Responsible for authentication identity and authentication-related flows.

### Firebase Storage

Responsible for uploaded profile images and Business logos.

### Email delivery

Application email delivery must be behind an adapter/interface.

Development must not depend on a paid provider.

Conceptually:

```text
EmailService
   ├── DevelopmentEmailAdapter
   └── ProductionEmailAdapter
```

Do not hard-code a provider into domain logic.

---

# 3. High-Level System Architecture

```text
                         Browser
                            │
                            ↓
                  React + TypeScript + Vite
                            │
                   React Router / UI
                            │
                     TanStack Query
                            │
                     HTTPS REST API
                            ↓
                ┌───────────────────────┐
                │   Express.js Server   │
                │                       │
                │ Routes                │
                │ Middleware            │
                │ Controllers           │
                │ Services              │
                │ Authorization         │
                │ Repositories          │
                └───────────┬───────────┘
                            │
                         Prisma
                            │
                            ↓
                       PostgreSQL

External integrations:
       ┌───────────────────┬───────────────────┐
       ↓                   ↓                   ↓
Firebase Auth       Firebase Storage      Email Adapter
```

The backend is a **modular monolith**. Do not create separate microservices for Auth, Inquiry, Notification, etc. in the MVP.

---

# 4. Core Architectural Principle

## 4.1 Client is not the authority

The frontend is responsible for:

- Presentation.
- User interaction.
- Client-side validation.
- Optimistic UX only where safe.
- Server-state rendering.

The frontend must NOT be trusted for:

- User role.
- Resource ownership.
- Inquiry state.
- Contact-email visibility.
- Permission decisions.
- Expiration.
- Duplicate prevention.

The server/database are authoritative.

---

# 5. Backend Layer Architecture

Every request should conceptually follow:

```text
HTTP Request
     ↓
Express Router
     ↓
Global middleware
     ↓
Authentication middleware
     ↓
Role/resource authorization
     ↓
Validation middleware
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
Response
```

## 5.1 Router

Responsible for:

- HTTP method/path.
- Middleware composition.
- Controller binding.

Routers must not contain business logic.

Bad:

```ts
router.post("/inquiries/:id/accept", async (req, res) => {
  // database updates
  // authorization
  // state transitions
});
```

Good:

```ts
router.post(
  "/inquiries/:id/accept",
  authenticate,
  requireRole("CREATOR"),
  validateRequest(...),
  inquiryController.accept
);
```

---

# 6. Controllers

Controllers translate HTTP requests into application operations.

Controller responsibilities:

- Extract route parameters.
- Extract authenticated user.
- Read validated request body/query.
- Invoke service.
- Map domain/application errors to HTTP responses.
- Return response DTO.

Controllers must not:

- Directly execute Prisma queries.
- Implement inquiry state transitions.
- Decide email privacy.
- Implement authorization rules.
- Contain large business algorithms.

---

# 7. Services

Services contain application/domain behavior.

Examples:

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

The InquiryService owns rules such as:

```text
PENDING → ACCEPTED
PENDING → REJECTED
```

The expiration process also uses the same state-transition rules.

---

# 8. Repositories

Repositories isolate database access.

Examples:

```text
UserRepository
CreatorRepository
BusinessRepository
InquiryRepository
SavedCreatorRepository
NotificationRepository
AuditEventRepository
```

Repositories should:

- Query PostgreSQL through Prisma.
- Encapsulate reusable queries.
- Avoid HTTP concerns.
- Avoid rendering/UI logic.

Business rules should remain in services, even if repositories expose convenient persistence operations.

---

# 9. Middleware

Cross-cutting middleware includes:

```text
authenticate
requireRole
validateRequest
errorHandler
requestId
rateLimit where appropriate
```

Middleware must remain focused.

---

# 10. Authentication Architecture

Firebase Authentication is the identity provider.

Conceptual flow:

```text
React
  ↓
Firebase Authentication
  ↓
Authenticated user
  ↓
Firebase ID token
  ↓
NestJS ❌
Express API
  ↓
Firebase Admin SDK verifies token
  ↓
Authenticated principal
  ↓
Application User lookup
```

Do not implement a second competing authentication system unless explicitly required.

## Backend authentication responsibilities

The backend must:

1. Receive the authentication credential according to the chosen Firebase integration.
2. Verify it server-side using Firebase Admin SDK.
3. Identify the Firebase user.
4. Resolve the application `User`.
5. Attach an authenticated principal to the request context.

Conceptually:

```ts
req.user = {
  id,
  firebaseUid,
  role,
  status
}
```

Do not trust role information supplied directly by the browser.

---

# 11. Authorization Architecture

Authorization has three levels.

## 11.1 Authentication

> Who is the user?

## 11.2 Role authorization

> Is this user a Creator or Business?

Examples:

```text
Creator → Creator inquiry actions
Business → Inquiry creation
```

## 11.3 Resource authorization

> Does this user have access to this particular resource?

Examples:

```text
Business A → Business B inquiry → 403
Creator A → Creator B private inquiry → 403
```

## 11.4 Relationship authorization

Some data is available only because a relationship exists.

Example:

```text
Business
   +
Creator
   +
Inquiry
   +
Inquiry.status = ACCEPTED
        ↓
Collaboration Email access
```

---

# 12. Authorization Rule: Email Privacy

Never implement:

```text
API returns private email
        ↓
React hides email
```

Instead:

```text
Request
  ↓
Authenticate
  ↓
Authorize
  ↓
Determine relationship
  ↓
Determine inquiry state
  ↓
Construct safe response DTO
  ↓
Return only permitted fields
```

Public Creator response must exclude `collaborationEmail`.

Pending inquiry response must exclude the private contact email.

Rejected/Expired inquiry responses must not expose collaboration email.

Accepted inquiry responses may expose contact information only to authorized participants.

---

# 13. Data Model

The following is the conceptual data model. Exact physical schema can be refined during implementation while preserving these relationships and constraints.

```text
User
 │
 ├────────────── CreatorProfile
 │
 └────────────── BusinessProfile
                       │
                       │
Business ───────── Inquiry ───────── Creator
   │
   └──────────── SavedCreator ─────── Creator

User ───────── Notification
User/Resource ─ AuditEvent
```

---

# 14. User Model

Conceptual fields:

```text
User
- id
- firebase_uid
- email
- role
- status
- created_at
- updated_at
- deleted_at
```

## Role

```text
CREATOR
BUSINESS
```

## Status

At minimum:

```text
ACTIVE
DELETED
```

Use soft deletion.

The exact representation may use an enum or equivalent.

---

# 15. CreatorProfile Model

Conceptual fields:

```text
CreatorProfile
- id
- user_id
- name
- profile_photo_url
- niche
- location
- bio
- specialties
- instagram_url
- youtube_url
- collaboration_email
- created_at
- updated_at
```

`collaboration_email` is private.

---

# 16. BusinessProfile Model

Conceptual fields:

```text
BusinessProfile
- id
- user_id
- business_name
- category
- description
- city
- state_or_province
- country
- logo_url
- website_url
- instagram_url
- collaboration_email
- created_at
- updated_at
```

Optional:

```text
logo_url
website_url
instagram_url
```

A local Business is valid without these fields.

---

# 17. Inquiry Model

Conceptual fields:

```text
Inquiry
- id
- business_id
- creator_id
- status
- collaboration_type
- platform
- deliverables
- timeline_start
- timeline_end
- brief
- additional_requirements
- created_at
- updated_at
- responded_at
- expires_at
- closed_at
```

The exact inquiry-field names may be adapted to the finalized UI, but the semantic fields must remain represented.

---

# 18. Inquiry State Machine

This is a core domain invariant.

```text
                     ┌───────────┐
                     │  PENDING  │
                     └─────┬─────┘
                           │
                ┌──────────┼──────────┐
                ↓          ↓          ↓
           ACCEPTED     REJECTED    EXPIRED

Participant/account unavailable:
        active relationship → CLOSED
```

Valid decisions:

```text
PENDING → ACCEPTED
PENDING → REJECTED
PENDING → EXPIRED
```

Do not allow:

```text
ACCEPTED → REJECTED
REJECTED → ACCEPTED
EXPIRED → ACCEPTED
EXPIRED → REJECTED
```

The backend must enforce the transition.

---

# 19. Inquiry Expiration

An inquiry becomes Expired when:

```text
status = PENDING
AND
now >= expires_at
```

Set:

```text
expires_at = created_at + 60 days
```

Use a scheduled backend process.

Do not depend on a user visiting the inquiry page.

The expiration operation must be safe to retry and must only transition still-Pending inquiries.

---

# 20. Account Deletion

Use soft deletion.

When a user deletes their account:

```text
User.status = DELETED
```

Then:

1. Invalidate their active session/authentication access.
2. Prevent new application activity.
3. Identify affected active inquiries/relationships.
4. Mark affected active inquiries as `CLOSED` where appropriate.
5. Preserve historical records according to privacy/retention requirements.
6. Protect/anonymize private data as required.
7. Record the account deletion event.

Do not convert account deletion into `REJECTED`.

---

# 21. Duplicate Inquiry Constraint

The product rule is:

> Only one active inquiry between a Business and Creator at a time.

The exact definition of "active" is:

```text
PENDING
ACCEPTED
```

`REJECTED`, `EXPIRED`, and `CLOSED` are not active for purposes of blocking a new inquiry.

Therefore:

```text
Business A + Creator X
PENDING  → cannot create another
ACCEPTED → cannot create another active inquiry
REJECTED → new inquiry allowed
EXPIRED  → new inquiry allowed
CLOSED   → new inquiry allowed when appropriate
```

This rule must be protected at the application and database/concurrency level.

Do not rely solely on the UI button state.

---

# 22. Concurrency Control

Example:

```text
Request A → Accept
Request B → Reject
```

Both arrive while the inquiry appears Pending.

The database must ensure only one transition succeeds.

Conceptually:

```text
UPDATE inquiry
SET status = ACCEPTED
WHERE id = ?
  AND status = PENDING
```

Then verify the affected row count.

If zero rows are affected:

- The inquiry has already changed state.
- Return a conflict/current-state response.
- Client re-fetches/reconciles.

Equivalent transactional approaches are acceptable.

---

# 23. Idempotency / Duplicate Mutation Protection

Protect against:

- Double click.
- Browser retry.
- Network retry.
- Duplicate HTTP requests.
- Multiple tabs.

For mutation endpoints, use an idempotency mechanism where appropriate.

For Inquiry creation, combine:

```text
Application duplicate check
+
Database uniqueness/concurrency protection
```

For state transitions, use conditional atomic updates/transactions.

---

# 24. Saved Creator Model

Conceptual fields:

```text
SavedCreator
- id
- business_id
- creator_id
- created_at
```

Constraint:

```text
UNIQUE(business_id, creator_id)
```

This prevents duplicate saves.

---

# 25. Notification Model

Conceptual fields:

```text
Notification
- id
- user_id
- type
- reference_id
- read_at
- created_at
```

Notification types should include:

```text
INQUIRY_RECEIVED
INQUIRY_ACCEPTED
INQUIRY_REJECTED
INQUIRY_EXPIRED
COLLABORATION_EMAIL_UPDATED
```

Additional account-related notification types may be added only when required.

---

# 26. Audit/Event Model

Record important domain events.

Recommended events:

```text
INQUIRY_CREATED
INQUIRY_ACCEPTED
INQUIRY_REJECTED
INQUIRY_EXPIRED
INQUIRY_CLOSED
COLLABORATION_EMAIL_UPDATED
ACCOUNT_DELETED
```

Conceptual fields:

```text
AuditEvent
- id
- event_type
- actor_user_id
- resource_type
- resource_id
- metadata
- created_at
```

Do not store unnecessary private data in event metadata.

No user-facing audit page is required for MVP.

---

# 27. API Design

Use REST.

Base path:

```text
/api/v1
```

Use nouns for resources and explicit action endpoints for state transitions where appropriate.

---

# 28. Authentication API

Logical capabilities:

```text
POST /api/v1/auth/register
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Firebase handles authentication-specific operations such as password recovery/email verification according to the chosen integration.

The backend still needs an application-user synchronization/bootstrap path.

Do not create duplicate password-storage logic in PostgreSQL.

---

# 29. Creator API

Logical endpoints:

```text
GET    /api/v1/creators
GET    /api/v1/creators/:creatorId
GET    /api/v1/creators/me
PATCH  /api/v1/creators/me
```

Public Creator Profile endpoints must use safe response DTOs.

Never include private collaboration email in public/search responses.

---

# 30. Business API

Logical endpoints:

```text
GET    /api/v1/businesses/me
PATCH  /api/v1/businesses/me
```

Creator-facing Business profile access must expose only allowed profile information.

---

# 31. Saved Creator API

Logical endpoints:

```text
GET    /api/v1/saved-creators
POST   /api/v1/saved-creators/:creatorId
DELETE /api/v1/saved-creators/:creatorId
```

Only Business users may use these endpoints.

---

# 32. Inquiry API

Logical endpoints:

```text
POST /api/v1/inquiries
GET  /api/v1/inquiries
GET  /api/v1/inquiries/:inquiryId
POST /api/v1/inquiries/:inquiryId/accept
POST /api/v1/inquiries/:inquiryId/reject
```

`GET /inquiries` must scope results by authenticated user's role and ownership.

Examples:

```text
Business → inquiries they sent
Creator  → inquiries they received
```

Never allow a client to provide another user's ID and bypass ownership rules.

---

# 33. Inquiry Creation

Flow:

```text
POST /inquiries
  ↓
Authenticate
  ↓
Require BUSINESS
  ↓
Validate body
  ↓
Resolve creator
  ↓
Check creator availability
  ↓
Check active duplicate inquiry
  ↓
Create PENDING inquiry
  ↓
Set expires_at = created_at + 60 days
  ↓
Create creator notification
  ↓
Create audit event
  ↓
Return safe inquiry DTO
```

---

# 34. Inquiry Accept

Flow:

```text
POST /inquiries/:id/accept
  ↓
Authenticate
  ↓
Require CREATOR
  ↓
Load inquiry
  ↓
Verify creator owns/receives inquiry
  ↓
Verify status = PENDING
  ↓
Atomic transition → ACCEPTED
  ↓
Set responded_at
  ↓
Create Business notification
  ↓
Create audit event
  ↓
Return accepted inquiry
```

Contact data should only be returned when the response is authorized to contain it.

---

# 35. Inquiry Reject

Flow:

```text
POST /inquiries/:id/reject
  ↓
Authenticate
  ↓
Require CREATOR
  ↓
Verify resource authorization
  ↓
Verify status = PENDING
  ↓
Atomic transition → REJECTED
  ↓
Set responded_at
  ↓
Create Business notification
  ↓
Create audit event
  ↓
Return rejected inquiry
```

No collaboration-email access is granted.

---

# 36. Accepted Contact Access

The response serializer/DTO must apply relationship-based privacy.

Conceptually:

```text
if inquiry.status === ACCEPTED
and authenticatedUser is business participant or creator participant:
    include permitted collaboration contact
else:
    exclude it
```

Never use the frontend as the privacy gate.

---

# 37. Notification API

Logical endpoints:

```text
GET  /api/v1/notifications
POST /api/v1/notifications/:notificationId/read
```

Only the notification owner may access/modify their notifications.

---

# 38. Error Contract

Use a consistent error shape.

Recommended:

```json
{
  "error": {
    "code": "INQUIRY_STATE_CONFLICT",
    "message": "The inquiry is no longer pending.",
    "requestId": "..."
  }
}
```

Do not expose:

- Stack traces.
- SQL errors.
- Internal exception messages.
- Tokens.
- Password information.
- Sensitive infrastructure details.

---

# 39. HTTP Status Semantics

Use semantic status codes consistently.

| Status | Meaning |
|---|---|
| 200 | Successful read/update/action |
| 201 | Resource created |
| 204 | Successful operation with no body |
| 400 | Malformed request where appropriate |
| 401 | Authentication required/invalid |
| 403 | Authenticated but not authorized |
| 404 | Resource does not exist |
| 409 | Duplicate/state/concurrency conflict |
| 422 | Validation failure where appropriate |
| 429 | Rate limit |
| 500 | Unexpected server error |
| 503 | Service unavailable where appropriate |

Do not return 200 with a fake success message for failed operations.

---

# 40. Frontend Architecture

Recommended structure:

```text
frontend/
└── src/
    ├── app/
    │   ├── router/
    │   ├── layouts/
    │   └── providers/
    │
    ├── components/
    │   ├── ui/
    │   ├── forms/
    │   ├── feedback/
    │   └── navigation/
    │
    ├── features/
    │   ├── auth/
    │   ├── creators/
    │   ├── businesses/
    │   ├── inquiries/
    │   ├── saved-creators/
    │   ├── notifications/
    │   └── settings/
    │
    ├── services/
    │   ├── api/
    │   └── firebase/
    │
    ├── hooks/
    ├── types/
    ├── schemas/
    └── utils/
```

---

# 41. Frontend Responsibilities

## Components

Presentation and interaction.

## Feature modules

Domain-specific UI and hooks.

## Services

API/Firebase integration.

## TanStack Query

Server-state caching, fetching, mutation, invalidation, and synchronization.

## React state

Local UI state.

Do not place every server response into a global Redux-style store.

---

# 42. Frontend Route Architecture

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

Exact URL names may be adapted to the existing application.

---

# 43. Route Guards

Frontend route guards improve UX but are not security boundaries.

Conceptual:

```text
ProtectedRoute
  ↓
Is authenticated?
  ├── no → login
  └── yes → continue
```

Role route:

```text
CreatorRoute
  ↓
role = CREATOR?
  ├── no → 403
  └── yes → continue
```

The backend must independently enforce the same rule.

---

# 44. Server-State Strategy

TanStack Query should manage:

- Creators.
- Creator Profiles.
- Business Profiles.
- Inquiries.
- Saved Creators.
- Notifications.

After mutations:

```text
Mutation success
  ↓
Use returned authoritative data
  OR
Invalidate/re-fetch relevant query
  ↓
UI reconciles
```

Do not allow stale local state to override the server.

---

# 45. Optimistic Updates

Use cautiously.

Safe candidates may include simple UI interactions such as save/unsave if rollback is correctly implemented.

Avoid optimistic inquiry-state transitions unless there is a strong reason.

For Accept/Reject:

```text
Click Accept
  ↓
Accepting...
  ↓
Server confirms
  ↓
Accepted
```

This prevents a false Accepted state during network failure.

---

# 46. Forms

Use:

```text
React Hook Form
+
Zod
```

Flow:

```text
User input
  ↓
Client schema validation
  ↓
API request
  ↓
Server validation
  ↓
Database
```

Server validation remains authoritative.

---

# 47. Reusable UI Components

Create reusable components for:

```text
Button
Input
Select
Textarea
Dialog
Dropdown
Toast
Alert
Tabs
Card
Badge
Skeleton
Avatar
Pagination
EmptyState
ErrorState
StatusBadge
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

---

# 48. Inquiry UI State Mapping

```text
PENDING
  → Pending badge
  → Creator: Accept / Reject
  → Business: awaiting response

ACCEPTED
  → Accepted badge
  → Contact access
  → External communication actions

REJECTED
  → Rejected badge
  → No contact access

EXPIRED
  → Expired badge
  → No decision actions

CLOSED
  → Closed/unavailable badge
  → No decision actions
```

---

# 49. Loading Architecture

Use reusable skeleton components.

Examples:

```text
DashboardSkeleton
CreatorProfileSkeleton
InquiryListSkeleton
InquiryDetailsSkeleton
BusinessProfileSkeleton
```

Mutation buttons show action-specific loading:

```text
Sending...
Accepting...
Rejecting...
Saving...
Uploading...
Deleting...
```

Disable the corresponding action during mutation.

---

# 50. Empty-State Architecture

Reusable EmptyState component.

Examples:

```text
No saved creators
No inquiries
No received inquiries
No search results
No filtered inquiries
```

Empty state is not an error.

Where appropriate, provide an actionable CTA.

---

# 51. Error Boundary

Use a global UI error boundary appropriate to the React setup.

Unexpected rendering errors must show a safe recovery page.

Do not display stack traces to users.

---

# 52. API Error Handling on Frontend

Centralize API error parsing.

Map server errors to user-friendly messages.

Examples:

```text
401 → session handling
403 → Forbidden
404 → Not Found
409 → current-state/duplicate conflict
422 → form validation
5xx → server error + retry
network → offline/network error
```

Do not duplicate this logic in every feature component.

---

# 53. Network Failure Strategy

For reads:

```text
Loading
  ↓
Network failure
  ↓
Error state
  ↓
Retry
```

For writes:

```text
Submitting
  ↓
Network failure
  ↓
Do not show success
  ↓
Preserve form/context
  ↓
Retry
```

After reconnection:

- Revalidate relevant server state.
- Do not blindly replay mutations.
- Reconcile stale data.

---

# 54. File Upload Architecture

Profile photos and Business logos use Firebase Storage.

Flow:

```text
User selects image
  ↓
Client validation
  ↓
Upload
  ↓
Storage URL
  ↓
Backend/profile update
  ↓
Database stores URL/reference
```

Do not store image binaries in PostgreSQL.

Validate:

- File type.
- File size.
- Image validity.

Failure:

```text
Upload failed
  ↓
Show error
  ↓
Retry
```

A Business without a logo remains valid.

---

# 55. Firebase Security

Firebase client configuration is not itself a secret.

Server-side Firebase Admin credentials/service-account material must never be committed to source control.

Use environment variables/secrets for server credentials.

Storage access rules must prevent unauthorized access to private files if private files are introduced.

Public profile images may use an appropriate public/read strategy, while private assets must remain protected.

---

# 56. Environment Configuration

Use environment-specific configuration.

Frontend example categories:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
```

Backend example categories:

```text
PORT
DATABASE_URL
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Never commit real secrets.

Provide:

```text
.env.example
```

with placeholders only.

---

# 57. Database Design Principles

Use PostgreSQL constraints wherever business invariants can safely be enforced.

Examples:

```text
User.firebase_uid UNIQUE
User.email UNIQUE where appropriate
SavedCreator(business_id, creator_id) UNIQUE
Foreign keys for relationships
Indexes on inquiry participant/status fields
```

Inquiry queries should be indexed around:

```text
business_id
creator_id
status
created_at
expires_at
```

Exact indexes should be verified against actual query patterns.

---

# 58. Prisma Architecture

Recommended:

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── src/
    └── database/
        └── prisma.ts
```

Use one appropriately managed PrismaClient instance in the application.

Do not instantiate a new PrismaClient per request.

---

# 59. Database Transactions

Use transactions for multi-step operations that must remain consistent.

Example Accept:

```text
BEGIN
  verify pending
  transition to accepted
  record response timestamp
  create audit event
  create notification
COMMIT
```

If the transaction fails:

```text
ROLLBACK
```

No partial Accepted state.

The exact notification delivery strategy can use an outbox/event mechanism later if required.

---

# 60. Notification Consistency

For MVP, notification creation can be part of the same database transaction for database-backed notifications.

Example:

```text
Inquiry accepted
   ↓
Transaction
 ├── update Inquiry
 ├── create Notification
 └── create AuditEvent
   ↓
Commit
```

This ensures the application does not persist an accepted inquiry while silently failing to create the corresponding database notification.

External email delivery should not hold the database transaction open.

---

# 61. Email Service Architecture

Use an abstraction:

```text
interface EmailService {
  send(...): Promise<void>
}
```

Implement:

```text
DevelopmentEmailService
ProductionEmailService
```

Domain services should depend on the abstraction, not a specific provider.

This allows a free/local development setup and later provider changes without rewriting inquiry logic.

---

# 62. Background Jobs

The MVP requires at least one scheduled process:

```text
Inquiry expiration job
```

Responsibilities:

- Find Pending inquiries whose expiration time has passed.
- Atomically transition to Expired.
- Create notification.
- Create audit event.
- Be safe to run repeatedly.

Do not put expiration logic into frontend code.

A production deployment may use a cron/scheduler appropriate to the chosen host.

---

# 63. Caching

Use caching selectively.

Good candidates:

- Creator discovery results.
- Public profile reads.
- Static metadata.

Be careful with:

- Inquiry status.
- Authorization-sensitive data.
- Collaboration emails.
- Account status.

After inquiry mutations, invalidate/revalidate affected queries.

---

# 64. Security Boundaries

The backend must enforce:

```text
Authentication
Role
Resource ownership
Relationship access
State transition
Private data visibility
```

The frontend may mirror these rules for UX, but never replace them.

---

# 65. Input Security

All user input must be treated as untrusted.

Apply:

- Schema validation.
- Type validation.
- URL validation.
- Email validation.
- Length limits.
- File restrictions.
- Safe rendering/escaping.
- Database parameterization through Prisma.

Do not construct raw SQL from user input.

---

# 66. Rate Limiting

Where appropriate, protect sensitive/high-volume endpoints such as:

- Authentication-related endpoints if proxied through backend.
- Inquiry creation.
- Password/account-related operations.
- Notification mutation.
- Upload initiation.

Exact limits should be established from expected usage and hosting constraints.

---

# 67. Logging

Use structured backend logging.

At minimum record:

- Request ID.
- Route.
- HTTP status.
- Duration.
- Error code.
- Relevant resource ID.
- Safe user identifier where appropriate.

Never log:

- Passwords.
- Auth secrets.
- Firebase private keys.
- Raw session tokens.
- Unnecessary collaboration emails.

---

# 68. Request IDs

Each backend request should have a request identifier.

Include it in error responses:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong.",
    "requestId": "..."
  }
}
```

This lets developers correlate user-visible failures with server logs.

---

# 69. Testing Architecture

Testing must exist at multiple levels.

## Unit tests

Test:

- Inquiry state transition rules.
- Duplicate inquiry logic.
- Authorization policies.
- Email visibility policy.
- Expiration logic.
- Validation.
- Service behavior.

## API/integration tests

Test:

- Authentication middleware.
- Role guards.
- Resource authorization.
- Inquiry endpoints.
- Database interactions.
- Notification creation.

## E2E tests

Use Playwright for critical user journeys.

---

# 70. Critical Test Scenarios

## Business

```text
Register
Verify
Create Business Profile
Discover Creator
Save Creator
Send Inquiry
View Pending
Creator accepts
View Accepted
See authorized contact
```

## Creator

```text
Register
Verify
Create Creator Profile
Receive Inquiry
View Inquiry
Accept
See collaboration state
```

## Rejection

```text
Pending → Reject → Rejected
```

## Expiration

```text
Pending → 60 days → Expired
```

## Duplicate

```text
Active inquiry exists
→ second inquiry rejected
```

## Concurrency

```text
Accept + Reject simultaneously
→ only one succeeds
```

## Authorization

```text
Business A → Business B inquiry → 403
Creator A → Creator B private data → 403
```

## Privacy

```text
Pending → email hidden
Accepted → authorized email visible
Rejected → email hidden
Expired → email hidden
```

---

# 71. Frontend Testing

Test:

- Route guards.
- Loading states.
- Empty states.
- Error states.
- Form validation.
- Button disabled state during mutation.
- Duplicate-click prevention.
- Correct status rendering.
- Contact visibility.
- Session-expired behavior.
- 403 page.
- 404 page.
- Responsive critical layouts.

---

# 72. Accessibility Architecture

Every feature must support:

- Keyboard navigation.
- Semantic controls.
- Proper labels.
- Focus management.
- Modal focus trapping/return.
- Screen-reader-friendly status.
- Error association.
- Visible focus.
- Adequate touch targets.

Status must not rely solely on color.

---

# 73. Responsive Architecture

Implement responsive layouts from the same component system.

Do not create separate application logic for desktop and mobile.

Use:

```text
same data
same domain logic
same components where practical
responsive layout
```

---

# 74. API DTO / Serialization Rule

Do not return raw Prisma entities directly from every endpoint.

Use response DTOs/serializers.

Example:

```text
CreatorPublicDTO
CreatorPrivateDTO
InquiryBusinessDTO
InquiryCreatorDTO
InquiryAcceptedDTO
BusinessPublicDTO
```

This is especially important for privacy.

A public Creator DTO must not accidentally acquire:

```text
collaborationEmail
```

because the Prisma model contains it.

---

# 75. Domain Terminology

Use these exact conceptual terms:

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

Do not introduce these as MVP domain entities:

```text
Campaign
Project
Workspace
Chat
Payment
Contract
Deliverable Management
```

A collaboration brief inside an Inquiry does not create a separate Campaign/Project entity.

---

# 76. Account Deletion Terminology

Use:

```text
DELETED user
CLOSED inquiry / unavailable relationship
```

Do not say:

```text
Deleted user = rejected inquiry
```

because that loses the reason for the lifecycle outcome.

---

# 77. UI/Backend State Alignment

The UI must derive status from server state.

Example:

```text
Backend:
status = ACCEPTED

Frontend:
status badge = Accepted
Accept button = hidden
Reject button = hidden
Contact access = enabled if authorized
```

The UI must never allow an invalid state just because a button was previously rendered.

---

# 78. Stale Query Handling

Example:

```text
Tab A: Pending
Tab B: Creator accepts
Tab A: Accept button clicked
```

Backend should return a conflict/current-state response.

Frontend:

```text
409/current state
  ↓
re-fetch inquiry
  ↓
render Accepted
```

---

# 79. Browser Refresh

Every protected page must be reconstructible from:

- Authentication state.
- Server state.
- Route parameters.

Do not depend on volatile in-memory React state for critical business information.

---

# 80. Browser Back Navigation

When a user navigates back to an inquiry:

- Revalidate stale server state where appropriate.
- Do not resurrect old action buttons.
- Respect current authorization.
- Respect current inquiry state.

---

# 81. Mobile Interaction

Critical actions such as:

```text
Accept
Reject
Send Inquiry
Save
Retry
Sign In Again
```

must remain visible, reachable, and usable on mobile.

Avoid destructive actions being too easy to trigger accidentally.

---

# 82. Design-System Rule

The finalized Stitch designs are the visual source for UI implementation.

However:

- Do not create business logic inside visual components.
- Do not duplicate domain behavior to match a screenshot.
- Preserve accessibility and responsive behavior even if a static design does not explicitly show it.
- Reuse the existing design system/components.

---

# 83. No Unrequested Product Expansion

AI IDE must not automatically add:

- Chat.
- Payment.
- Contracts.
- Campaigns.
- Project management.
- Ratings.
- Analytics.
- Notification center.
- Additional social networks.
- Additional roles.

If an implementation problem appears to require a new product feature, stop and update `REQUIREMENTS.md`/`ARCHITECTURE.md` before coding it.

---

# 84. Recommended Repository Structure

```text
creator-connect/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── creators/
│   │   │   ├── businesses/
│   │   │   ├── inquiries/
│   │   │   ├── saved-creators/
│   │   │   ├── notifications/
│   │   │   ├── uploads/
│   │   │   └── audit/
│   │   ├── database/
│   │   ├── routes/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── README.md
├── .env.example
└── .gitignore
```

The exact nesting can be simplified if the existing repository has an established convention. Do not refactor an existing working project merely to match this tree.

---

# 85. Module Structure

Each backend domain should follow a predictable structure.

Example:

```text
inquiries/
├── inquiry.controller.ts
├── inquiry.service.ts
├── inquiry.repository.ts
├── inquiry.schemas.ts
├── inquiry.routes.ts
├── inquiry.types.ts
└── inquiry.test.ts
```

For larger modules:

```text
inquiries/
├── controllers/
├── services/
├── repositories/
├── schemas/
├── policies/
├── types/
└── tests/
```

Choose one consistent convention; do not mix both patterns arbitrarily.

---

# 86. Dependency Direction

Preferred:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Repositories
  ↓
Prisma
```

Supporting utilities can be used across layers, but lower-level database code must not import UI code.

The backend must never import frontend modules.

---

# 87. Configuration Management

Centralize environment configuration.

Do not access `process.env` throughout business logic.

Use a configuration module that:

- Loads variables.
- Validates required configuration.
- Exposes typed configuration.

---

# 88. Development Environment

Target:

```text
Frontend → localhost:5173
Backend  → localhost:8000
Postgres → localhost:5432
```

Ports can change if required by the existing repository.

Local PostgreSQL can run through Docker or a native installation.

Development must be possible without paying for cloud infrastructure.

---

# 89. Local Development Philosophy

The complete core application should be runnable locally:

```text
React
+
Express
+
Prisma
+
PostgreSQL
+
Firebase Auth integration
```

External email delivery should have a development adapter.

Do not require a paid service just to run tests or develop core functionality.

---

# 90. Database Migration Strategy

Use Prisma migrations.

Never manually modify production schema without a migration.

Development flow:

```text
Change Prisma schema
  ↓
Create migration
  ↓
Apply migration
  ↓
Update generated Prisma client
  ↓
Run tests
```

---

# 91. Seed Data

Create deterministic development seed data for:

- Business.
- Creators.
- Inquiries in each state.
- Saved creators.
- Notifications.

Seed data must never contain real private information.

Useful states:

```text
Pending inquiry
Accepted inquiry
Rejected inquiry
Expired inquiry
Closed inquiry
```

---

# 92. Security Testing Matrix

Before release, verify:

| Test | Expected |
|---|---|
| Guest → protected route | Login |
| Creator → Business endpoint | 403 |
| Business → Creator private endpoint | 403 where applicable |
| Business A → Business B inquiry | 403 |
| Creator A → Creator B private inquiry | 403 |
| Pending inquiry → Creator email | Hidden |
| Rejected inquiry → Creator email | Hidden |
| Expired inquiry → Creator email | Hidden |
| Accepted inquiry → authorized Business | Email available |
| Accepted inquiry → authorized Creator | Business contact available where permitted |
| Client submits fake role | Server ignores/rejects |
| Client submits fake state | Server ignores/rejects |
| Double inquiry | One active inquiry |
| Concurrent accept/reject | One valid final state |

---

# 93. Performance Principles

No arbitrary production SLA was finalized in product requirements. Establish measurable targets during deployment planning.

The architecture should:

- Paginate large lists.
- Avoid unnecessary API calls.
- Cache safe read-heavy data.
- Lazy-load non-critical frontend routes.
- Optimize images.
- Avoid returning private data unnecessarily.
- Index inquiry participant/status/time queries.
- Use TanStack Query cache effectively.
- Avoid N+1 database access patterns.

---

# 94. Scalability Strategy

Start with:

```text
Single React application
Single Express application
Single PostgreSQL database
```

Scale vertically first.

If usage later requires it, independently scale:

```text
Frontend
Backend
Database
Background workers
```

Do not introduce microservices before there is a demonstrated need.

---

# 95. Future Architecture Extension Points

The architecture should leave room for future modules:

```text
Chat
Campaigns
Projects
Payments
Contracts
Deliverables
Analytics
```

But these are extension points only.

Do not implement them now.

---

# 96. Implementation Rules for Gemini Anti-Gravity

Anti-Gravity must:

1. Read `REQUIREMENTS.md` first.
2. Read `ARCHITECTURE.md` second.
3. Inspect the existing repository before modifying code.
4. Preserve existing working functionality.
5. Identify existing implementation of finalized screens/features.
6. Avoid duplicating existing functionality.
7. Follow the locked stack.
8. Use Express.js, not NestJS.
9. Use TypeScript.
10. Use Prisma with PostgreSQL.
11. Use Firebase Authentication for identity.
12. Enforce authorization server-side.
13. Treat PostgreSQL/server state as authoritative.
14. Implement inquiry state transitions centrally.
15. Keep controllers thin.
16. Keep business logic in services.
17. Isolate database access.
18. Use response DTOs for privacy.
19. Add tests alongside important domain logic.
20. Implement one dependency-safe phase at a time.
21. Run tests/type checks/lint after each meaningful phase.
22. Do not silently introduce new product features.
23. Do not rewrite working architecture without explaining why.
24. Do not delete existing functionality unless the requirements explicitly replace it.

---

# 97. AI Implementation Sequence

The recommended dependency order is:

```text
Phase 0
Repository audit
       ↓
Phase 1
Project/tooling foundation
       ↓
Phase 2
Database + Prisma
       ↓
Phase 3
Firebase authentication integration
       ↓
Phase 4
Express middleware + authorization
       ↓
Phase 5
Profiles
       ↓
Phase 6
Creator discovery + saved creators
       ↓
Phase 7
Inquiry creation
       ↓
Phase 8
Inquiry state machine
       ↓
Phase 9
Business inquiry management
       ↓
Phase 10
Creator inquiry management
       ↓
Phase 11
Post-acceptance contact access
       ↓
Phase 12
Notifications
       ↓
Phase 13
Account deletion + expiration job
       ↓
Phase 14
Edge states + reliability
       ↓
Phase 15
Accessibility + responsive audit
       ↓
Phase 16
Security audit
       ↓
Phase 17
E2E testing
```

---

# 98. Phase 0 — Existing Repository Audit

Before coding:

- Inspect frontend.
- Inspect backend if present.
- Identify existing framework.
- Identify current routes.
- Identify existing authentication.
- Identify existing database.
- Identify current components.
- Identify existing Creator/Business/Inquiry implementation.
- Compare implementation with `REQUIREMENTS.md`.
- Identify reusable code.
- Identify gaps.

Output an implementation plan before large changes.

---

# 99. Phase 1 — Foundation

Establish:

```text
TypeScript
Express
React/Vite
Prisma
PostgreSQL
Firebase configuration
Linting
Formatting
Testing
Environment validation
```

Verify:

```text
Frontend starts
Backend starts
Database connects
Prisma migration works
Health endpoint works
Frontend can reach backend
```

---

# 100. Phase 2 — Database

Implement:

- User.
- CreatorProfile.
- BusinessProfile.
- Inquiry.
- SavedCreator.
- Notification.
- AuditEvent.

Add:

- Foreign keys.
- Required constraints.
- Unique constraints.
- Relevant indexes.
- Migrations.
- Seed data.

---

# 101. Phase 3 — Authentication

Implement:

- Firebase client integration.
- Firebase Admin verification.
- Application user lookup.
- Registration/bootstrap.
- Login integration.
- Logout.
- Email verification integration.
- Password reset integration.
- Session expiration behavior.

Test authenticated/unauthenticated requests.

---

# 102. Phase 4 — Authorization

Implement reusable:

```text
authenticate
requireRole
resource authorization policies
relationship authorization
```

Do not duplicate authorization rules inside every controller.

---

# 103. Phase 5 — Profiles

Implement Creator:

- Onboarding.
- Profile.
- Edit.
- Image upload.
- Public profile.

Implement Business:

- Onboarding.
- Profile.
- Edit.
- Logo upload.
- Creator-facing profile.

Add validation and privacy DTOs.

---

# 104. Phase 6 — Discovery & Saved Creators

Implement:

- Creator listing.
- Search/filter behavior from finalized UI.
- Creator cards.
- Creator details.
- Save.
- Unsave.
- Saved list.
- Empty/loading/error states.

---

# 105. Phase 7 — Inquiry Creation

Implement:

- Inquiry form.
- Validation.
- Create API.
- Duplicate active inquiry check.
- PENDING state.
- `expires_at`.
- Creator notification.
- Audit event.

---

# 106. Phase 8 — Inquiry State Machine

Implement centrally:

```text
acceptInquiry()
rejectInquiry()
expireInquiry()
closeInquiry()
```

All must validate the current state.

Use transactions/conditional updates.

Add unit and integration tests before moving forward.

---

# 107. Phase 9 — Business Inquiry Management

Implement:

- My Inquiries.
- Status filters.
- Inquiry Details.
- Accepted state.
- Rejected state.
- Expired state.
- Closed state.
- Authorized contact access.
- External communication actions.

---

# 108. Phase 10 — Creator Inquiry Management

Implement:

- Received Inquiries.
- Filters.
- Inquiry Details.
- Accept.
- Reject.
- Accepted state.
- Rejected state.
- Expired state.
- Closed state.

---

# 109. Phase 11 — Post-Acceptance Workflow

Implement:

```text
Accepted
  ↓
Authorized contact access
  ↓
Email action
  ↓
Instagram action where available
  ↓
External collaboration
```

Do not create an in-app chat/workspace.

---

# 110. Phase 12 — Notifications

Implement header notification functionality.

Events:

```text
Inquiry received
Inquiry accepted
Inquiry rejected
Inquiry expired
Collaboration email updated
```

Persist read/unread state.

---

# 111. Phase 13 — Lifecycle Jobs

Implement:

### Inquiry expiration

```text
PENDING + expires_at <= now
→ EXPIRED
```

### Account deletion

```text
ACTIVE → DELETED
affected active inquiries → CLOSED
```

Ensure operations are safe and repeatable.

---

# 112. Phase 14 — Reliability

Implement and verify:

- Skeletons.
- Loading buttons.
- Empty states.
- API errors.
- Network failures.
- Retry.
- Upload failures.
- Duplicate submission prevention.
- Concurrent action protection.
- Stale-state reconciliation.
- Session expiry.
- 403.
- 404.

---

# 113. Phase 15 — Responsive & Accessibility

Audit all finalized screens.

Verify:

- Desktop.
- Tablet.
- Mobile.
- Keyboard.
- Focus.
- Forms.
- Modals.
- Status semantics.
- Touch interactions.

---

# 114. Phase 16 — Security Audit

Verify:

- Firebase token verification.
- Server-side role enforcement.
- Resource authorization.
- Relationship authorization.
- Email privacy.
- Input validation.
- Safe rendering.
- Secret management.
- Rate limiting.
- Logging hygiene.
- Database constraints.
- Mutation concurrency.

---

# 115. Phase 17 — End-to-End Verification

Run the complete flows:

### Business happy path

```text
Register
→ Verify
→ Business Profile
→ Discover
→ Creator Profile
→ Save
→ Send Inquiry
→ Pending
→ Creator accepts
→ Accepted
→ Contact access
→ External communication
```

### Creator happy path

```text
Register
→ Verify
→ Creator Profile
→ Receive Inquiry
→ Inquiry Details
→ Accept
→ Accepted
→ Business contact access
→ External communication
```

### Rejection

```text
Pending → Reject → Rejected
```

### Expiration

```text
Pending → 60 days → Expired
```

### Account deletion

```text
Active participant
→ Delete
→ Account unavailable
→ affected active inquiry Closed
```

---

# 116. Final Architecture Invariants

The following rules must never be violated:

```text
1. Express.js is the backend HTTP framework.
2. TypeScript is used on frontend and backend.
3. PostgreSQL is the core relational database.
4. Prisma is the ORM.
5. Firebase Authentication provides authentication identity.
6. Server-side authorization is mandatory.
7. Public Creator APIs never expose Collaboration Email.
8. Pending inquiries never expose private collaboration email.
9. Rejected/Expired inquiries do not grant contact access.
10. Accepted inquiry grants relationship-based contact access.
11. Only one active inquiry exists between a Business and Creator.
12. PENDING can transition to ACCEPTED, REJECTED, or EXPIRED only.
13. Expiration occurs after 60 days without response.
14. Account deletion is not represented as rejection.
15. Active relationships affected by account deletion become Closed/unavailable.
16. Backend is the source of truth.
17. Inquiry mutations must be concurrency-safe.
18. Duplicate submissions must be protected at both UX and server/data levels.
19. Controllers remain thin.
20. Business logic lives in services/domain logic.
21. Database access is isolated.
22. Private data is controlled through response DTOs.
23. Header notifications are sufficient for MVP.
24. No in-app chat/campaign/payment/project workspace in MVP.
25. The application is a modular monolith.
26. AI-generated changes must follow REQUIREMENTS.md and ARCHITECTURE.md.
27. No new product capability is introduced without updating the source-of-truth documents.
```

---

# 117. Definition of Technical Completion

The implementation is technically complete when:

- [ ] Frontend builds successfully.
- [ ] Backend builds successfully.
- [ ] TypeScript has no unresolved type errors.
- [ ] Database migrations execute successfully.
- [ ] Seed data works.
- [ ] Authentication works.
- [ ] Authorization tests pass.
- [ ] Resource ownership tests pass.
- [ ] Email privacy tests pass.
- [ ] Inquiry state-machine tests pass.
- [ ] Duplicate inquiry tests pass.
- [ ] Concurrency tests pass.
- [ ] Expiration tests pass.
- [ ] Account deletion tests pass.
- [ ] Notification tests pass.
- [ ] API integration tests pass.
- [ ] Frontend unit/component tests pass.
- [ ] Critical Playwright flows pass.
- [ ] Loading/empty/error states exist.
- [ ] 401/403/404 handling exists.
- [ ] Session expiry exists.
- [ ] Responsive audit passes.
- [ ] Accessibility audit passes.
- [ ] No secrets are committed.
- [ ] No unauthorized private data is returned.
- [ ] No out-of-scope MVP functionality has been introduced.

---

# 118. Final Mental Model

The entire architecture can be understood as:

```text
                       CREATOR CONNECT
                              │
             ┌────────────────┴────────────────┐
             │                                 │
          BUSINESS                           CREATOR
             │                                 │
         Discovery                           Profile
             │                                 │
      Creator Profile                  Received Inquiry
             │                                 │
       Save / Inquiry                     Review
             │                                 │
             └───────────────┬─────────────────┘
                             ↓
                          INQUIRY
                             ↓
                          PENDING
                       /      │      \
                      ↓       ↓       ↓
                 ACCEPTED  REJECTED  EXPIRED
                      │
                      ↓
             Collaboration Confirmed
                      │
                      ↓
             Relationship Authorization
                      │
                      ↓
              Controlled Contact Access
                      │
                 ┌────┴────┐
                 ↓         ↓
               Email    Instagram
                 │         │
                 └────┬────┘
                      ↓
             External Collaboration
```

Supporting this core:

```text
Firebase Authentication
        +
Express.js
        +
Authorization
        +
Prisma
        +
PostgreSQL
        +
Notifications
        +
Audit Events
        +
Background Expiration Job
```

This is the target implementation architecture for the Creator Connect MVP.
