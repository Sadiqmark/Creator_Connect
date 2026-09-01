# Creator Connect — Design System & Visual Direction

> **Document:** `DESIGN_SYSTEM.md`
> **Purpose:** Visual and interaction source of truth for Creator Connect.
>
> `REQUIREMENTS.md` defines **what** the product must do.  
> `ARCHITECTURE.md` defines **how** the product is built.  
> `DESIGN_SYSTEM.md` defines **how** the product looks, feels, moves, and behaves.

---

## 1. Design Vision

Creator Connect is a creator-business collaboration platform.

The visual identity must feel:

- Creator-first
- Visual
- Premium
- Editorial
- Socially familiar
- Human
- Confident
- Modern
- Simple without feeling generic

The product should combine:

**Instagram-inspired visual discovery + premium creator portfolio + editorial web design + collaboration marketplace UX.**

It must **not** feel like:

- A generic SaaS dashboard
- An AI-generated UI template
- A corporate admin panel
- An Instagram clone
- A card-heavy startup template

---

## 2. Inspiration Strategy

### Instagram — interaction inspiration

Use Instagram as inspiration for:

- Visual creator discovery
- Strong profile identity
- Image-first presentation
- Profile hierarchy
- Media grids
- Save/favorite interactions
- Lightweight notifications
- Familiar social navigation

Do **not** copy Instagram branding, exact colors, logo, exact layout, or proprietary UI.

### Siteinspire — visual/art-direction inspiration

Use Siteinspire for:

- Minimal layouts
- Portfolio presentation
- Photography
- Grid layouts
- Typography
- Design/art direction
- Interactive motion
- Occasional unusual layouts

Siteinspire currently has large collections in Minimal, Portfolio, Photography, Grid Layout, Typographic, Design & Art Direction, and Web & Interactive Design. citeturn0search0turn0search2

Useful references:

- https://www.siteinspire.com/websites/category/minimal
- https://www.siteinspire.com/websites/category/portfolio
- https://www.siteinspire.com/websites/category/photography
- https://www.siteinspire.com/websites/category/web-and-interactive-design
- https://www.siteinspire.com/websites/category/design-and-art-direction

These are inspiration sources, not designs to copy. citeturn0search5turn0search4turn0search10turn0search3turn0search9

---

## 3. Core Design Principle

> **Content creates the visual energy; the interface provides the structure.**

Creator images, profiles, portfolios, typography, and whitespace should provide most of the visual personality.

Avoid compensating with:

- Excessive gradients
- Excessive shadows
- Decorative blobs
- Glassmorphism
- Giant icons
- Generic illustrations
- Colorful cards everywhere

---

## 4. Brand Personality

Creator Connect should feel:

```text
Creative
Confident
Warm
Visual
Editorial
Approachable
Premium
Human
```

Avoid:

```text
Corporate
Cold
Over-engineered
Childish
Generic
AI-generated
Overly decorative
```

---

## 5. Color System

Do not use the generic purple/blue SaaS palette.

Do not copy Instagram's exact pink/purple gradient.

Use a restrained neutral foundation with one distinctive accent.

Suggested initial tokens:

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

The accent can be visually refined during design exploration, but the principles are locked:

1. Warm neutral base.
2. Near-black primary text.
3. One dominant brand accent.
4. No competing palette per screen.
5. Photography supplies much of the color.

---

## 6. Typography

Use two complementary font families.

### Display

A distinctive editorial serif or display face.

Use for:

- Major landing headlines
- Large section introductions
- High-impact marketing moments

### UI

A clean modern sans-serif.

Use for:

- Navigation
- Forms
- Buttons
- Metadata
- Body text
- Status
- Dense UI

Do not use the display font for dense application UI.

Suggested scale:

```text
Display XL  64px / 1.0
Display L   48px / 1.05
Display M   36px / 1.1

Heading XL  32px / 1.15
Heading L   28px / 1.2
Heading M   22px / 1.25
Heading S   18px / 1.3

Body L      18px / 1.55
Body M      16px / 1.5
Body S      14px / 1.45
Caption     12px / 1.4
```

Use responsive typography.

---

## 7. Layout

Avoid dense enterprise-dashboard composition.

Prefer:

```text
Full-width page
    ↓
Content max-width
    ↓
Intentional sections
    ↓
Whitespace
    ↓
Visual hierarchy
```

Recommended content width: approximately `1200px–1440px`, depending on screen.

### Grid

Desktop: 12 columns  
Tablet: 8 columns  
Mobile: 4 columns

Discovery:

- 3–4 visual items per row desktop
- 2 tablet
- 1–2 mobile depending on content

---

## 8. Spacing

Use:

```text
4
8
12
16
24
32
48
64
80
96
128 px
```

Large spacing between major sections.

Smaller spacing within component groups.

---

## 9. Radius and Shadows

Do not make everything excessively rounded.

Suggested:

```text
Input:       8px
Button:      8px
Dialog:      12px
Card:        12px where needed
Avatar:      50%
Images:      0–12px depending on composition
```

Pills are reserved for:

- Tags
- Status
- Categories
- Compact filters

Shadows should be subtle and mainly used for:

- Dialogs
- Dropdowns
- Floating menus
- Sticky UI where needed

Most cards should work with spacing, borders, imagery, and typography rather than heavy shadows.

---

## 10. Navigation

Navigation should be minimal and role-aware.

Business:

```text
Discover
Saved Creators
My Inquiries
Profile
Notifications
```

Creator:

```text
Discover
My Inquiries
Profile
Notifications
```

Do not force a heavy enterprise sidebar onto every screen.

Mobile should use a compact top/bottom navigation pattern.

---

## 11. Discovery — Signature Screen

Discovery should be one of the defining Creator Connect experiences.

Prefer:

```text
DISCOVER CREATORS

Find people worth
collaborating with.

[ Search creators... ]

Fashion   Food   Travel   Beauty   Fitness

┌────────────┬────────────┬────────────┐
│            │            │            │
│   IMAGE    │   IMAGE    │   IMAGE    │
│            │            │            │
│ @creator   │ @creator   │ @creator   │
│ Fashion    │ Food       │ Travel     │
│ Mumbai     │ Delhi      │ Goa        │
└────────────┴────────────┴────────────┘
```

Discovery should feel visual rather than like a CRM.

---

## 12. Creator Cards

Prefer visual-first cards.

Hierarchy:

```text
Creator Image
Name / handle
Niche
Location
Save interaction
```

Avoid stuffing cards with:

- Ratings
- Fake social statistics
- Unnecessary badges
- Large button groups
- Excessive metadata

Do not invent follower counts or engagement metrics unless the product actually stores/verifies them.

Desktop may use subtle hover enhancement.

Mobile must expose all essential information without hover.

---

## 13. Creator Profile

Creator Profile is a hero experience.

Hierarchy:

```text
Profile image
Name / handle
Niche
Location
Bio
Specialties
Platforms
Primary actions
Portfolio/content
```

Example:

```text
             [Profile Photo]

             @creatorname

      Fashion • Lifestyle • Travel

            Mumbai, India

      Short creator biography...

      [ Save Creator ] [ Send Inquiry ]

      ─────────────────────────────

              WORK / PORTFOLIO

      ┌────────┬────────┬────────┐
      │ IMAGE  │ IMAGE  │ IMAGE  │
      ├────────┼────────┼────────┤
      │ IMAGE  │ IMAGE  │ IMAGE  │
      └────────┴────────┴────────┘
```

Do not invent unavailable social metrics.

---

## 14. Business Profile

Business Profile should feel like a real identity rather than a settings form.

Show:

- Business logo if available
- Business name
- Category
- Location
- Description
- Website if available
- Instagram if available

Local businesses without a logo, website, or Instagram must still have a polished profile.

Use a tasteful initials/typographic fallback for missing logos.

---

## 15. Business Dashboard

The Business dashboard combines discovery and operational clarity.

```text
Good morning, [Business].

Find creators for your next collaboration.

[ Search creators ]

Saved creators       12
Active inquiries      4
Awaiting responses    3

────────────────────────

Recommended creators

[ Visual grid ]

────────────────────────

Recent inquiries
```

Metrics remain secondary.

Creator discovery is the primary action.

---

## 16. Creator Dashboard

Creator dashboard should feel personal, not corporate.

```text
Good morning, [Creator].

Your collaboration space.

────────────────────────

New inquiries

[ Inquiry previews ]

────────────────────────

Your profile

[ Profile preview ]

Profile completeness

████████░░ 80%

────────────────────────

Recent activity
```

---

## 17. Inquiry Experience

Inquiry details should feel like a professional collaboration brief.

```text
ABC Coffee
Mumbai, India

COLLABORATION INQUIRY

We're looking for a creator
to help introduce our new
summer menu.

────────────────────────

DELIVERABLES

01  Instagram Reel
02  3 Stories

────────────────────────

TIMELINE

June 12 — June 20

────────────────────────

MESSAGE

...

────────────────────────

[ Decline ]

[ Accept Inquiry ]
```

Use typography and spacing instead of many nested cards.

---

## 18. Inquiry Status

Statuses:

```text
Pending
Accepted
Rejected
Expired
Closed
```

Suggested treatment:

```text
Pending   → neutral/warm
Accepted  → success
Rejected  → danger/subdued
Expired   → muted
Closed    → muted/neutral
```

Never rely on color alone.

---

## 19. Inquiry Actions

Primary:

```text
Accept Inquiry
```

Secondary/destructive:

```text
Decline
```

During mutation:

```text
Accepting...
Rejecting...
```

Prevent duplicate clicks.

For invalid states, remove invalid actions and explain the current state when necessary.

---

## 20. Post-Acceptance Experience

After acceptance:

```text
ACCEPTED

Collaboration confirmed.

You can now contact each other directly.

[ Email Creator ]
[ Instagram ]
```

Exact options depend on available data and authorization.

Do not create in-app chat.

---

## 21. Contact Privacy UX

Before acceptance:

```text
Collaboration email

Private until inquiry is accepted
```

After acceptance:

```text
Collaboration email
creator@example.com

[ Email Creator ]
```

The actual private email must never appear on public creator cards or profiles.

---

## 22. Notifications

Header notifications are sufficient for MVP.

Example:

```text
🔔 3
```

Popover:

```text
Notifications

● ABC Coffee sent you an inquiry
  2m

● Your inquiry was accepted
  1h

● New collaboration activity
  3h

See all activity →
```

Keep this lightweight.

---

## 23. Empty States

Empty states should be designed experiences.

Example:

```text
No saved creators yet.

Start discovering creators who match
your next collaboration.

[ Discover Creators ]
```

Avoid only saying:

```text
No data found.
```

---

## 24. Loading States

Use layout-matching skeletons:

```text
CreatorGridSkeleton
ProfileSkeleton
InquiryListSkeleton
InquiryDetailsSkeleton
DashboardSkeleton
```

Avoid generic full-page spinners for ordinary page loads.

Mutation actions show:

```text
Sending...
Accepting...
Rejecting...
Saving...
Uploading...
```

---

## 25. Error States

Use concise human language:

```text
Something went wrong.

We couldn't load these creators.

[ Try Again ]
```

Never expose stack traces, Axios errors, Prisma errors, or raw HTTP messages to users.

---

## 26. 404 / Forbidden / Session Expired

### 404

```text
404

Looks like this page
wandered off.

[ Back to Discover ]
```

### Forbidden

```text
You don't have access to this page.

[ Go to Dashboard ]
```

Do not reveal sensitive resource information.

### Session expired

```text
Your session has expired.

Please sign in again to continue.

[ Sign In ]
```

Preserve a safe return destination where appropriate.

---

## 27. Motion

Motion is required, but subtle.

Purpose:

- Communicate state.
- Reinforce hierarchy.
- Make interactions responsive.
- Add polish without distracting from creator content.

Suggested durations:

```text
Micro interaction  120–180ms
Hover/button       150–200ms
Modal/panel        200–300ms
Page transition    200–350ms
```

Recommended interactions:

### Creator card

```text
hover
→ image scale 1.01–1.03
→ subtle metadata/action transition
```

### Button

```text
hover
→ color/elevation transition
```

### Save

```text
♡ → ♥
```

with a small scale/opacity animation.

### Inquiry

```text
Send
→ Sending...
→ Sent / Inquiry Created
```

### Modal

```text
opacity 0 → 1
small translate/scale
```

---

## 28. Do Not Use These Animations

Avoid:

- Constant floating elements
- Large parallax
- Excessive scroll animations
- Bouncing buttons
- Spinning decoration
- Animated gradients everywhere
- Cursor-following effects
- Heavy 3D
- Long page transitions
- Animation that blocks interaction

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

---

## 29. Components

Shared UI:

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
Skeleton
EmptyState
ErrorState
Tabs
Tooltip
Navigation
SearchInput
FilterChip
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

Do not put domain-specific components into the generic UI library.

---

## 30. Buttons

Variants:

```text
Primary
Secondary
Ghost
Destructive
Link
```

Primary:

```text
Send Inquiry
Accept Inquiry
Save Creator
```

Secondary:

```text
View Profile
Cancel
```

Destructive:

```text
Reject
Delete Account
```

Avoid excessive variants.

---

## 31. Forms

Inputs should use:

```text
Label
Input
Helper/Error
```

Do not rely only on placeholders.

Use React Hook Form + Zod as defined by `ARCHITECTURE.md`.

Inline validation should be close to the field.

---

## 32. Images

Creator imagery is a primary visual asset.

Rules:

- High quality.
- Meaningful cropping.
- Consistent aspect ratio per context.
- Minimal borders.
- No heavy filters.
- No artificial gradients over every image.

Missing profile image/logo:

```text
Initials / typographic fallback
```

Never show broken image icons.

---

## 33. Responsive Design

Same visual system across desktop, tablet, and mobile.

### Desktop

- Multi-column visual grid
- Hover interactions
- Spacious layouts

### Tablet

- Reduced columns
- Reduced spacing
- Responsive typography

### Mobile

- Single-column or compact grid
- Thumb-friendly actions
- Simple navigation
- Readable inquiry details
- Primary actions easy to reach

Do not create separate business logic for mobile.

---

## 34. Accessibility

Required:

- Semantic HTML.
- Keyboard navigation.
- Visible focus.
- Proper labels.
- Accessible dialogs/dropdowns.
- Screen-reader-friendly status.
- Meaningful alt text.
- Color contrast.
- Reduced-motion support.
- No color-only status communication.

---

## 35. Anti-AI-Generated-UI Rules

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

The product should look intentionally art-directed.

---

## 36. Stitch Usage

Stitch-generated screens are exploration/reference material, not immutable specifications.

Preserve:

- Finalized product flow.
- Required information.
- User actions.
- Domain behavior.

Improve when needed:

- Visual hierarchy.
- Spacing.
- Typography.
- Motion.
- Responsive behavior.
- Accessibility.
- Interaction feedback.

Do not blindly reproduce a weak Stitch screen.

---

## 37. Screen Review Process

For every screen:

```text
Product requirement
      ↓
Existing flow check
      ↓
Visual design
      ↓
Responsive design
      ↓
Interaction states
      ↓
Loading / empty / error
      ↓
Accessibility
      ↓
Motion
      ↓
Final visual review
      ↓
Implementation
```

Required states where relevant:

```text
Default
Loading
Empty
Error
Success
Disabled/Unavailable
Mobile
Desktop
Submitting
Conflict/Stale
Network failure
```

---

## 38. Visual Quality Gate

Before accepting a design, ask:

- Does it feel like Creator Connect?
- Does it feel visual?
- Does it feel human?
- Is creator/content the hero?
- Is typography distinctive?
- Is the layout intentional?
- Is there enough whitespace?
- Is the UI restrained?
- Are interactions polished?
- Does it avoid generic SaaS styling?
- Does it avoid looking AI-generated?
- Does it remain usable without animation?

If several answers are no, redesign before implementation.

---

## 39. Design Tokens

Centralize:

```text
Colors
Typography
Spacing
Radius
Shadows
Motion
Breakpoints
```

Do not scatter arbitrary visual values throughout components.

---

## 40. Anti-Gravity Instructions

Anti-Gravity must:

1. Read `REQUIREMENTS.md`.
2. Read `ARCHITECTURE.md`.
3. Read `DESIGN_SYSTEM.md`.
4. Inspect existing implementation.
5. Reuse finalized screens where appropriate.
6. Never replace working functionality only to match a visual reference.
7. Follow shared design tokens.
8. Prefer visual grids over card-heavy discovery.
9. Use creator imagery as the visual hero.
10. Use editorial typography.
11. Keep UI chrome restrained.
12. Add subtle purposeful motion.
13. Respect reduced motion.
14. Implement loading/empty/error states.
15. Implement mobile and desktop behavior.
16. Preserve accessibility.
17. Never introduce generic AI-dashboard styling.
18. Never copy Instagram branding.
19. Never copy a Siteinspire website directly.
20. Do not introduce a new palette per screen.
21. Do not introduce a new font per screen.
22. Do not add decorative UI without UX value.
23. If visual design conflicts with product requirements, preserve product behavior and flag the conflict before changing it.

---

## 41. Final Design Acceptance Criteria

A screen is ready when:

- [ ] It follows Creator Connect visual language.
- [ ] It does not look like generic SaaS.
- [ ] It does not copy Instagram.
- [ ] Shared colors are used.
- [ ] Shared typography is used.
- [ ] Spacing is consistent.
- [ ] Cards are used intentionally.
- [ ] Creator imagery has appropriate visual priority.
- [ ] Primary action is obvious.
- [ ] Secondary actions are subordinate.
- [ ] Loading state exists.
- [ ] Empty state exists where relevant.
- [ ] Error state exists.
- [ ] Success state exists where relevant.
- [ ] Mobile layout exists.
- [ ] Keyboard/focus behavior works.
- [ ] Motion is subtle.
- [ ] Reduced motion is respected.
- [ ] Private information is not exposed.
- [ ] The screen feels intentionally designed rather than AI-generated.

---

## 42. Final Design Mental Model

```text
                 CREATOR CONNECT
                       │
            ┌──────────┴──────────┐
            │                     │
       DISCOVERY              IDENTITY
            │                     │
      Visual Grid          Creator Profile
      Photography          Business Profile
      Search               Portfolio
      Categories           Social Links
            │                     │
            └──────────┬──────────┘
                       ↓
                  INQUIRY
                       ↓
              Editorial Brief
                       ↓
             Accept / Reject
                       ↓
                  ACCEPTED
                       ↓
              Contact Access
                       ↓
            External Collaboration
```

The product's visual story is:

> **Discover → Understand → Connect → Collaborate**
