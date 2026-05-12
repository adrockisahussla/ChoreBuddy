# Buddy-side self-edit — design plan

Symmetric counterpart to commit `8ba7bf7` (manager-side edit). A buddy
should be able to update *their own* profile from `buddy-app.html`,
without involving the manager for everyday cosmetic changes.

This document covers data model, UI, rules, sync, edge cases, and a
scope estimate. No code is written here beyond a rules sketch.

## 1. Data model — what can a buddy edit about themselves?

The `User` shape lives in `src/types.ts:105-118`. Field-by-field:

| Field         | Classification     | Reasoning |
|---------------|--------------------|-----------|
| `id`          | System-managed     | Firestore doc id. Immutable. |
| `uid`         | System-managed     | Firebase Auth uid. Changing it breaks the join to the auth identity. |
| `familyId`    | Manager-only       | Buddy doesn't get to walk out of a family on their own — that's a removal flow the manager owns (see "leaving the family" below). |
| `role`        | Manager-only       | Self-promoting from `buddy` to `manager` is a privilege escalation. Manager-only. |
| `email`       | System-managed     | Tied to Firebase Auth identity. Manager-side already locks it (`AddBuddyForm.tsx:182-198`); same logic applies on the buddy side. To change email, you re-invite. |
| `displayName` | Joint              | Self-editable in practice, but the manager always retains the ability to overwrite. Length/profanity caveats below. |
| `avatar`      | Self-editable      | Cosmetic, low stakes. The canonical "I want to change this myself" field. |
| `accent`      | Self-editable      | Cosmetic per-buddy color. |
| `age`         | Joint              | Low-stakes today (only displayed). Let the buddy edit; manager can correct. If `age` ever drives content gating, reclassify to Manager-only. |
| `createdAt`   | System-managed     | Immutable. |
| `textScale`   | Self-editable      | UI accessibility preference. Already controlled live by the buddy via the Settings screen on the RN side; should be writeable on web too. |

### Specific judgement calls the prompt asked about

- **Display name** — yes, buddy can change it. It's their name. But
  the manager already has an edit button that wins by recency (last
  write wins in Firestore); see §5 for conflict handling. Keep a
  modest length cap (24 chars, mirroring `AddBuddyForm.tsx:178`).
- **Email** — no. It's the auth identity, and any change would
  desync the user doc from the Firebase Auth user. Same rationale
  the manager-side modal uses. To change it, the manager revokes and
  re-invites with the new address.
- **Leaving the family** — no, not via the profile editor. A
  buddy "leaving" is destructive (orphans chores/rewards, see the
  comment on `userService.remove` in `src/services/userService.ts:63-70`),
  and conceptually it's a parent/child relationship the buddy didn't
  unilaterally enter. If we ever want a "request to leave" flow it
  should be a separate proposal doc the manager confirms, not a
  field edit. Out of scope for this plan.

## 2. UI surface in the buddy app

`buddy-app.html` already has a side menu (`SideMenu`, ~line 967) with
a header that shows avatar + name + role (lines 980–984). That header
is the obvious self-edit entry point — tapping it opens a profile
sheet.

Currently the SideMenu reads `meName`/`meEmoji` from the legacy
`view` switch (`'kid1' | 'kid2' | 'manager'`) rather than from the
authenticated `identity` doc. That's pre-existing and worth fixing
in this same change: route both via `identity.displayName` and
`identity.avatar`.

### Entry point

Make the menu header tappable. Add a small ✏️ affordance in the
corner so it's discoverable but doesn't dominate the menu.

```
┌─ Side menu ─────────────────┐
│  💜               ✏️         │  ← tap anywhere on header to edit
│  Dadson                      │
│  Buddy                       │
├──────────────────────────────┤
│  Home                        │
│  Chores                      │
│  …                           │
```

### Profile sheet

Reuse the visual language of `AddBuddyForm.tsx` in edit mode: a
slide-in modal with header, big avatar preview, name field, avatar
picker grid, and a Save button. Email read-only with the same
"locked — sign-in identity" helper text. No role selector. No
remove/danger zone (a buddy can't self-eject).

```
┌─ My profile ────────────────┐
│  ←   My profile             │
├──────────────────────────────┤
│        ╭─────╮               │
│        │ 💜  │  [Change]     │
│        ╰─────╯               │
│                              │
│  AVATAR                      │
│  💜 🧡 💚 💙 ❤️ 💛           │
│  🦊 🐯 🐼 🦄 🐶 🐱           │
│                              │
│  YOUR NAME                   │
│  [ Dadson              ]     │
│                              │
│  EMAIL                       │
│  [ dadson@gmail.com    ] 🔒  │
│  Locked — it's how you       │
│  sign in.                    │
│                              │
│  ┌────────────────────────┐  │
│  │     Save changes       │  │
│  └────────────────────────┘  │
│                              │
│  ────────────────────────    │
│  Sign out                    │
└──────────────────────────────┘
```

Sign-out lives here too — it's currently buried in the failure
states of `AuthGate` (lines 748, 766) but has no entry point for a
signed-in buddy. Putting it on the profile sheet is the right home.

The avatar list should match the canonical set in
`AddBuddyForm.tsx:13` and the existing buddy-app inline list at
`buddy-app.html:1226`:
`['💜','🧡','💚','💙','❤️','💛','🦊','🐯','🐼','🦄','🐶','🐱']`.

## 3. Permissions / Firestore rules

No `firestore.rules` file is tracked in the repo — rules are
configured live in the Firebase Console. The rules below need to be
applied there and (ideally as part of this work) committed to a new
`firestore.rules` at the project root so future changes can be
diffed.

### Predicate, in plain language

For a write on `users/{docId}`:

1. **Authenticated**: `request.auth.uid` must be present.
2. **Self-write**: the doc being written must belong to the
   requester — i.e. the doc's `uid` field equals `request.auth.uid`.
   (We can't key by `request.auth.uid` directly because the user
   doc id is a Firestore-generated id, not the auth uid.)
3. **Field allowlist**: the diff between existing and incoming doc
   may only touch the self-editable fields:
   `displayName`, `avatar`, `accent`, `age`, `textScale`.
   Any attempt to modify `familyId`, `role`, `email`, `uid`, or
   `createdAt` from a buddy-authenticated client is rejected.
4. **Basic validation** on the values that are touched:
   - `displayName` is a string of length 1–24.
   - `avatar` is a string of length ≤ 8 (single emoji codepoints
     plus VS-16 selectors).
   - `accent` matches a `#rrggbb` pattern, or is null.
   - `age` is an integer in `[0, 120]`, or is null.
   - `textScale` is a number in `[0.75, 2.0]`.

Pseudo-rule (illustrative, not final syntax):

```
match /users/{docId} {
  allow read: if signedIn() && sameFamily();
  allow update: if signedIn()
    && resource.data.uid == request.auth.uid
    && request.resource.data.diff(resource.data)
         .affectedKeys()
         .hasOnly(['displayName','avatar','accent','age','textScale'])
    && validSelfFields(request.resource.data);
  allow create, delete: if isManager();  // unchanged from today
}
```

Manager-side writes (the AddBuddyForm edit path) continue to work
because the manager's role check satisfies a separate `allow update`
branch with no field allowlist. Add that branch *before* the
self-write branch in the rules file, since rule branches OR
together.

### What we explicitly do **not** want

- Permitting `familyId` writes — would let a kid orphan themselves
  out of the family.
- Permitting `role` writes — privilege escalation.
- Permitting `uid` writes — would let an attacker take over another
  user's doc.

## 4. Notification + sync flow

`SubmissionToasts.tsx` fires Android toasts to the manager when a
buddy submits a chore, suggests a reward, or claims a reward. Those
are *workflow-relevant* events the manager needs to act on.

A buddy changing their own avatar or name is **not** workflow-
relevant. The manager doesn't need to approve it. So:

- **Silent sync.** The manager's `useBuddies` subscription already
  re-renders the Buddies list / BuddyProfile hero card when the
  underlying user doc changes; no extra plumbing needed.
- **No toast.** Adding `"Dadson updated their avatar"` toasts would
  be noisy without being actionable, and unlike chore submissions
  there's nothing for the manager to do in response.

If we ever want a "recent activity" feed on the manager side, that's
where this signal belongs — not a transient toast.

### Where to *not* mirror SubmissionToasts

Concretely: do **not** add a fourth `useEffect` block to
`SubmissionToasts.tsx` watching `useBuddies()` for diffs. Keep that
file focused on submission/claim transitions.

## 5. Edge cases

### Offline buddy

Firestore's SDK queues local writes and reconciles on reconnect.
Show optimistic UI immediately (close the sheet, render the new
avatar), and rely on the local cache + queue to flush later. No
extra code needed beyond what Firestore gives us for free; just
don't `await` the write before closing the sheet in a way that
blocks on the network.

### Simultaneous edit (buddy + manager touch the same field)

Firestore is last-write-wins per field, with no built-in conflict
resolution. For `displayName` specifically, the realistic scenario
is "manager fixes a typo while the kid is mid-edit." That's rare
enough that we accept last-write-wins and document the behavior.

If it becomes a real problem, options (out of scope):

- Add a monotonic `nameVersion` field and write with a transaction
  that aborts on mismatch.
- Use a Cloud Function to merge.

For now: **explicitly accept last-write-wins.**

### Inappropriate display name

The manager can always overwrite via the existing edit modal
(`AddBuddyForm.tsx`). That's the moderation override — we don't need
an automated profanity filter. Length is capped at 24 chars by both
the buddy form and the rules, which prevents the "ASCII art name"
exploit. If a buddy repeatedly griefs, the manager's last resort is
the existing Remove-Buddy flow.

### Other small ones worth naming

- **Empty name on save:** disable the Save button when
  `name.trim() === ''`, matching `AddBuddyForm.tsx:55-57`.
- **Avatar that's not in the allowlist:** unlikely via the picker
  UI, but the rules-side length cap prevents most abuse. Don't bother
  with a strict enum — emoji set changes shouldn't require a rules
  redeploy.
- **`identity.id` desync after edit:** the buddy app reads
  `identity` from `AuthGate` once and passes it down. After a self-
  edit we should either (a) re-read the user doc via the existing
  subscription, or (b) optimistically merge the patch into local
  state. Option (b) is simpler given the existing flow.

## 6. Implementation scope estimate

| Piece | Where | Estimate |
|-------|-------|----------|
| Buddy-side UI: profile sheet, menu header tap target, avatar picker, sign-out row | `buddy-app.html` — new `ProfileSheet` component + wire-up in `SideMenu` / `Kid` | **1 day** |
| Self-edit Firestore write | `buddy-app.html` — small `updateMe(patch)` helper that calls `db.collection('users').doc(identity.id).update(patch)` | **~1 hour**, bundled with the UI day |
| Fix SideMenu header to read from `identity` instead of `view` | `buddy-app.html:967-984` | **~1 hour**, bundled |
| `userService` changes | None — manager-side `userService.update` is untouched. Buddy app uses raw `db.collection` calls. | **0** |
| Firestore rules update + console deploy + check in a `firestore.rules` file | New file at repo root | **half a day** (most of it is writing emulator tests / sanity-checking manager-side still works) |
| Manager-side notifications | None — see §4. | **0** |
| Manual QA pass (sign in as buddy, change avatar, watch it appear on manager device; try to set `role: manager` via a hand-crafted write to confirm rules reject it) | — | **~1 hour** |

**Total: about 1.5–2 days of focused work.** Most of the time is in
the buddy-app HTML (single-file, no build step, but ~2200 lines of
soup) and the rules-side verification.

### Suggested sequencing

1. Land the rules change first (with the new self-editable allowlist
   *and* the existing manager-side path) and verify nothing on the
   manager side regresses.
2. Then add the buddy-side UI. If the rules are wrong, the UI errors
   loudly; if the UI ships before the rules, the buddy gets silent
   failures.

## Open questions

- Should `accent` actually be self-editable? It's currently
  hard-coded per-buddy (k1=purple, k2=orange) in `KID_PROFILES` and
  doesn't seem to flow from the user doc yet on the buddy side.
  Treat as self-editable in the rules (cheap), defer the picker UI.
- Do we want a "preview" of how the manager will see the name change
  before saving? Probably not — adds friction for a cosmetic edit.
