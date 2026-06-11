# EVENT_FLOWS — ChoreBuddy event & notification spec

**Version:** v1.24 · **Last verified:** 2026-05-24

> If you change a toast string, persistence flag, or Firestore field touched by a notifier, update the matching entry below. This file is the canonical answer to "when X happens, what should the user see, and on which device?"

---

## Conventions

**Event names:** `SCREAMING_SNAKE`, scoped by feature — `CHORE_*`, `REMINDER_*`, `REWARD_*`, `CLAIM_*`, `INVITE_*`, `BUDDY_*`.

**Audience codes:**
- `SELF` — the user who triggered the action.
- `ASSIGNER` — `chore.createdBy`.
- `ASSIGNEE` — `chore.assignedTo` / `reminder.assignedTo`.
- `MANAGERS_IN_FAMILY` — all users with `role === 'manager'` in the family (legacy fallback when `createdBy` is missing).
- `FAMILY` — every signed-in user in the family (whoever has the relevant screen mounted).
- `INVITEE` — the recipient of an invite, identified by email.

**Toast surfaces:**
- `bottom-toast` — Android `ToastAndroid.show`. Default position. Queued through [`src/utils/toastQueue.ts`](../src/utils/toastQueue.ts) when bursty (offline catchup).
- `notifee-system` — Notifee `displayNotification` (instant) or `createTriggerNotification` (scheduled). Lands in the OS notification shade; can wake the device.
- `header-badge` — red dot count rendered by the `<Header>` `badge` prop.

**Persistence flags** (boolean fields on docs that gate "have we notified yet"):
- `chore.notifiedAssigner` — true once `usePendingChoreNotifier` has fired for the assigner. Cleared on submit.
- `chore.notifiedAssignee` — true once `useApprovedChoreNotifier` has fired for the assignee. Cleared on submit + on approve write.
- `chore.notifiedAssignedTo` — true once `useAssignedChoreNotifier` has fired for newly-assigned-to-me chores.
- `chore.collectedAt` — epoch ms when the kid tapped Collect to bank the points. Uncollected approvals don't count toward the wallet.
- `reminder.notificationId` — Notifee trigger id; presence means "we scheduled this." Cleared on edit/delete.
- `invite.acceptedAt` / `acceptedByUid` — set on accept; gates the `InviteBanner` visibility.
- `rewardClaim.notifiedClaimant` — true once `useClaimResolvedNotifier` has fired on the kid's device for an approve/deny resolution.
- `user.minutesRemaining` — kid's screen-time wallet. Atomic increment on claim fulfillment via `userService.addMinutes`.

**Snapshot model.** Every screen subscribes to its data via `useChores` / `useReminders` / `useRewards` / `useRewardClaims` / `useInvites` / `useFamilyMembers`, all of which wrap Firestore `onSnapshot`. There is no explicit messaging layer — writes propagate live to every device with the relevant screen mounted. **Offline:** the Firestore SDK caches writes locally and replays them on reconnect; the receiver's notifier hooks re-evaluate on the next snapshot tick, so any unseen state changes fire one toast + one notification per affected doc on next foreground.

**Architectural limit.** All notifications below are local-only. If the receiver's app is fully swipe-killed, no toast or notification fires until they open the app. Push-when-killed needs FCM + a Cloud Function on the Blaze plan (not enabled).

---

## Table of contents

- [Chore flow](#chore-flow) (10)
  - `CHORE_POOL_SAVED` · `CHORE_ASSIGNED` · `CHORE_NEW_FOR_ASSIGNEE` · `CHORE_SUBMITTED` · `CHORE_AWAITING_APPROVAL` · `CHORE_APPROVED` · `CHORE_COLLECTED` · `CHORE_REJECTED` · `CHORE_DELETED` · `CHORE_WEEKLY_RESET`
- [Reward Pool flow](#reward-pool-flow) (3) — `REWARD_POOL_ADDED` · `REWARD_POOL_EDITED` · `REWARD_POOL_DELETED`
- [Reminder flow](#reminder-flow) (5)
  - `REMINDER_CREATED` · `REMINDER_UPDATED` · `REMINDER_DELETED` · `REMINDER_FIRED` · `REMINDER_SCHEDULE_FAILED`
- [Reward & claim flow](#reward--claim-flow) (6)
  - `REWARD_SUGGESTED` · `REWARD_APPROVED` · `REWARD_REJECTED` · `CLAIM_REQUESTED` · `CLAIM_FULFILLED` · `CLAIM_DENIED`
- [Invite flow](#invite-flow) (6)
  - `INVITE_CREATED` · `INVITE_BANNER_SHOWN` · `INVITE_ACCEPTED` · `INVITE_DECLINED` · `INVITE_BLOCKED` · `INVITE_REVOKED`
- [Buddy management](#buddy-management) (3)
  - `BUDDY_ADDED` (alias of INVITE_CREATED) · `BUDDY_EDITED` · `BUDDY_REMOVED`
- [Permissions](#permissions) (1)
  - `REMINDER_PERMISSIONS_REQUESTED`
- [Known gaps](#known-gaps)

---

## Chore flow

### CHORE_POOL_SAVED
- **Trigger** — Manager taps **Save** (pool-only, no assignment) on `ChoreFormSheet` or `ChorePoolScreen`'s pool form. See [`src/components/ChoreFormSheet.tsx`](../src/components/ChoreFormSheet.tsx) `savePoolOnly` and [`src/screens/manager/ChorePoolScreen.tsx`](../src/screens/manager/ChorePoolScreen.tsx) `savePoolOnly`.
- **Audience** — `SELF` only.
- **Firestore** — `chorePool/{auto}` add: `{ familyId, title, recurrence, points, createdAt }`. Update path patches the same doc.
- **Toast** — `bottom-toast`, SHORT: `✓ Saved "<title>" to pool` (create) / `✓ Updated "<title>" in pool` (edit).
- **Notifee** — none.
- **Persists** — n/a.
- **Offline** — Firestore caches the write; toast fires immediately from local state.
- **UI** — Pool list re-renders via `useChorePool` snapshot.

### CHORE_ASSIGNED
- **Trigger** — Manager taps **Save & Assign** on `ChoreFormSheet`, or assigns from the chore-pool sheet. Sources: `ChoreFormSheet.saveAndAssignTo`, `ChorePoolScreen.saveAndAssignTo`.
- **Audience** — `SELF` (confirmation) + `ASSIGNEE` (next snapshot — no notification fires here).
- **Firestore** — `chores/{auto}` add: `{ familyId, title, assignedTo, status:'todo', rejectionNote:'', recurrence, dueDate, weekOf, points, completedAt:0, overdue:false, createdBy:<myUid>, optionally weekdays, remindBeforeMinutes }`. Pool template also patched.
- **Toast** — `bottom-toast`, SHORT, on assigner device: `✓ Assigned "<title>" to <buddy>`.
- **Notifee** — none. Per-device chore-due alarm scheduling happens later via `useChoreReminderScheduling` when the assignee's device sees the snapshot.
- **Persists** — n/a.
- **Offline** — Firestore caches; assignee sees the new chore + (eventually) due-time alarms once their device syncs.
- **UI** — Chore appears in `BuddyChoresScreen` (both manager-side and buddy-side) under the **Todo** tab.

### CHORE_NEW_FOR_ASSIGNEE
- **Trigger** — Side-effect of `CHORE_ASSIGNED`. Fired by [`src/hooks/useAssignedChoreNotifier.ts`](../src/hooks/useAssignedChoreNotifier.ts) on the assignee's device when a chore lands with `assignedTo===myUid && status==='todo' && !notifiedAssignedTo`. 48 h freshness gate (`createdAt > now - 48h`) so legacy chores don't burst-toast on app install.
- **Audience** — `ASSIGNEE`.
- **Firestore** — `chores/{id}` update: `{ notifiedAssignedTo: true }` after dispatch (also written for stale chores to silence them).
- **Toast** — `bottom-toast` via `toastQueue`: `📋 New chore: "<title>" from <assigner> · +<N> pts`.
- **Notifee** — id `chore-assigned-<choreId>`, title `📋 New chore`, body `<assigner> assigned "<title>" — +<N> pts`.
- **Persists** — `notifiedAssignedTo=true` is permanent (no clearing — "newly assigned" only happens once).
- **Offline** — Standard cold-start replay; flag prevents re-toast.

### CHORE_SUBMITTED
- **Trigger** — Assignee taps the empty circle on a `'todo'` or `'rejected'` chore. Sources: [`src/screens/buddy/BuddyChoresScreen.tsx`](../src/screens/buddy/BuddyChoresScreen.tsx) `submit`, and [`src/screens/manager/BuddyChoresScreen.tsx`](../src/screens/manager/BuddyChoresScreen.tsx) `onTapCircle` *viewingSelf* branch (manager-as-assignee).
- **Audience** — `SELF` (local confirmation) + `ASSIGNER` (see `CHORE_AWAITING_APPROVAL`).
- **Firestore** — `chores/{id}` update: `{ status:'pending', completedAt:Date.now(), rejectionNote:'', notifiedAssigner:false, notifiedAssignee:false }`.
- **Toast** — `bottom-toast`, SHORT, assignee device: `✓ Sent for approval`. Tab auto-switches to **Pending**.
- **Notifee** — none direct; the assigner-side notification fires via the next event.
- **Persists** — clears `notifiedAssigner` so the assigner's notifier picks it up on the next snapshot.
- **Offline** — submit is cached; on reconnect the write propagates and the assigner's notifier fires.
- **UI** — Chore moves from Todo → Pending tab on assignee's screen; on assigner's screen it appears in the Pending tab + badges Home.

### CHORE_AWAITING_APPROVAL
- **Trigger** — Side-effect of `CHORE_SUBMITTED`. Fired by [`src/hooks/usePendingChoreNotifier.ts`](../src/hooks/usePendingChoreNotifier.ts) on the assigner's device when a chore snapshot lands with `status==='pending'`, `createdBy===myUid` (legacy fallback: `iAmManager`), and `!notifiedAssigner`. Also fired by global [`src/components/SubmissionToasts.tsx`](../src/components/SubmissionToasts.tsx) which watches every chore in the family.
- **Audience** — `ASSIGNER` (via `usePendingChoreNotifier`) + `FAMILY` (via `SubmissionToasts`, scoped to whichever family members have the app open).
- **Firestore** — `chores/{id}` update: `{ notifiedAssigner:true }` written after notification dispatches.
- **Toast** — `bottom-toast`, SHORT, from `SubmissionToasts`: `✓ <submitterName> marked "<title>" done`. Submitter name resolved via `useFamilyMembers` so manager-to-manager submissions name the actual person.
- **Notifee** — `notifee-system`, id `chore-pending-<choreId>`, title `✋ Chore awaiting approval`, body `<submitterName> submitted "<title>"` (or `"<title>" was submitted for review` if name missing). Channel: `chorebuddy-reminders`, HIGH importance.
- **Persists** — `notifiedAssigner=true` prevents re-fire across device restarts.
- **Offline** — On assigner's next foreground, any pending chore with `!notifiedAssigner && createdBy===me` fires one toast + one notification.
- **UI** — Manager's Header badge increments (filter: `status==='pending' && createdBy===myUid`). Buddy's row appears in Pending tab on assigner's `BuddyChoresScreen`.

### CHORE_APPROVED
- **Trigger** — Assigner taps the empty circle on a pending chore (manager screen, *not* viewingSelf). Sources: [`src/screens/manager/BuddyChoresScreen.tsx`](../src/screens/manager/BuddyChoresScreen.tsx) `onTapCircle` non-viewingSelf branch, and [`src/screens/manager/ActiveChoresScreen.tsx`](../src/screens/manager/ActiveChoresScreen.tsx) `onApprove`.
- **Audience** — `SELF` (confirmation) + `ASSIGNEE` (toast + notification).
- **Firestore** — `chores/{id}` update: `{ status:'approved', completedAt:Date.now(), notifiedAssignee:false }`.
- **Toast** —
  - Assigner device, `bottom-toast` SHORT: `✓ Approved "<title>"`.
  - Assignee device, `bottom-toast` (via `toastQueue`, paced 2.5 s apart): `Your chore "<title>" has been approved! +<points> points earned.`
- **Notifee** — Assignee device only. Id `chore-approved-<choreId>`, title `🎉 Chore approved`, body `"<title>" — +<points> points earned`. Source: [`src/services/notificationService.ts`](../src/services/notificationService.ts) `notifyChoreApproved`, dispatched by [`src/hooks/useApprovedChoreNotifier.ts`](../src/hooks/useApprovedChoreNotifier.ts).
- **Persists** — `notifiedAssignee=true` written after each toast/notif. Cleared by `CHORE_SUBMITTED` so re-approvals (post-rejection or weekly reset + resubmit) re-notify.
- **Offline** — Assignee's app re-evaluates on next mount; multiple approved-while-offline chores all fire, queued by `toastQueue` so none overwrite.
- **UI** — Row moves to **Done** tab on both devices. Points pill on `BuddyHomeScreen` + `BuddyRewardsScreen` increments live (derived from `chores.filter(approved).reduce(points)`). Manager Header badge decrements.

### CHORE_COLLECTED
- **Trigger** — Assignee taps the big **🪙 Collect +N pts** button in the Done tab on [`src/screens/buddy/BuddyChoresScreen.tsx`](../src/screens/buddy/BuddyChoresScreen.tsx) `collect`. Only approved chores without `collectedAt` show the button.
- **Audience** — `SELF`.
- **Firestore** — `chores/{id}` update: `{ collectedAt: Date.now() }`.
- **Toast** — `bottom-toast` SHORT: `🪙 +<N> pts collected!`.
- **Notifee** — none.
- **Persists** — `collectedAt` is permanent. Uncollected approvals stay forever (no expiry).
- **Wallet impact** — `available = sum(approved && collectedAt) - sum(approved claims) - sum(pending claims)`. The points pill on `BuddyHomeScreen` + `BuddyRewardsScreen` ticks up live via snapshot.
- **UI** — Row leaves the "Collect your points!" sub-section and moves into "Collected" below it. Wallet across all screens reflects the new total.

### CHORE_REJECTED
- **Trigger** — Assigner taps the ✕ button on a pending chore, types a note, taps **Reject**. Source: [`src/screens/manager/BuddyChoresScreen.tsx`](../src/screens/manager/BuddyChoresScreen.tsx) `submitReject`.
- **Audience** — `SELF` only. *Assignee is NOT notified* — they discover it next time they open Todo tab, where the chore reappears with a red `❌ <note>` line. **Known gap.**
- **Firestore** — `chores/{id}` update: `{ status:'rejected', rejectionNote:<note> }`.
- **Toast** — `bottom-toast` SHORT on assigner device: `✗ Rejected "<title>"`. No assignee toast.
- **Notifee** — none.
- **Persists** — `notifiedAssigner` and `notifiedAssignee` are not touched here, but the next submit clears both.
- **Offline** — Standard Firestore propagation.
- **UI** — Chore returns to assignee's **Todo** tab with `c.status === 'rejected'` and the red note rendered inline.

### CHORE_DELETED
- **Trigger** — Manager taps 🗑 on a non-pending chore row (hidden when manager is viewingSelf) and confirms. Source: [`src/screens/manager/BuddyChoresScreen.tsx`](../src/screens/manager/BuddyChoresScreen.tsx) `onDelete`, and [`src/screens/manager/ActiveChoresScreen.tsx`](../src/screens/manager/ActiveChoresScreen.tsx) `onDelete`.
- **Audience** — `SELF` only.
- **Firestore** — `chores/{id}` delete.
- **Toast** — `bottom-toast` SHORT: `Removed "<title>"`. On failure, LONG: `Delete failed: <message>`.
- **Notifee** — none.
- **UI** — Row vanishes from both devices via snapshot.

### CHORE_WEEKLY_RESET
- **Trigger** — App boot (`App.tsx` `useEffect`). [`src/services/choreService.ts`](../src/services/choreService.ts) `resetWeeklyChores(firestore())`. Runs once per cold start.
- **Audience** — `FAMILY` (silent — no user-facing event).
- **Firestore** — For every chore with `recurrence==='weekly'` whose `weekOf` is older than the current ISO week: update `{ status:'todo', completedAt:0, rejectionNote:'', weekOf:<currentWeek> }`. `notifiedAssignee` is NOT explicitly cleared but the next submit will clear it.
- **Toast** — none.
- **Notifee** — none.
- **Offline** — Runs on the device that opened the app; the write fans out via snapshot.
- **UI** — Chores reappear in **Todo** tabs across the family.

---

## Reminder flow

### REMINDER_CREATED
- **Trigger** — Any user taps **Create Reminder** in [`src/components/NewReminderForm.tsx`](../src/components/NewReminderForm.tsx) `submit` (create branch). Form rejects past times (`isPastTime` guard at `previewDue <= Date.now() + 30_000`).
- **Audience** — `SELF` (confirmation) + per-buddy `ASSIGNEE` (alarm fires later).
- **Firestore** — `reminders/{auto}` add per selected buddy: `{ familyId, title, assignedTo, date, time, allDay:false, recurrence, dueDate, weekOf, notes, createdBy, optionally weekdays }`. After Notifee schedule succeeds, a follow-up update writes `{ notificationId }`.
- **Toast** — `bottom-toast` SHORT on success: `✓ Reminder set for <buddy>` (single) or `✓ Reminder set for <N> buddies` (multi). On failure see `REMINDER_SCHEDULE_FAILED`.
- **Notifee** — `notifee-system` trigger via [`src/services/notificationService.ts`](../src/services/notificationService.ts) `scheduleReminderNotification`. Id `reminder:<docId>`, title `🔔 <title>`, body `For <buddy>`, `TimestampTrigger` at `dueDate`, `alarmManager.allowWhileIdle=true`. Channel: `chorebuddy-reminders`, ALARM category, HIGH importance, PUBLIC visibility, full-screen intent for the overlay.
- **Persists** — `notificationId` on the doc lets edit/delete cancel the trigger.
- **Offline** — Doc add caches and replays; Notifee scheduling is local so it requires the device to be online with the form-saver — the buddy's own device will re-schedule on next snapshot via `useReminderScheduling`.
- **UI** — Reminder appears in `RemindersScreen` (manager) and `BuddyHomeScreen` (buddy) reminders sections.

### REMINDER_UPDATED
- **Trigger** — Edit submit in `NewReminderForm`. Source: same file, edit branch.
- **Audience** — `SELF`.
- **Firestore** — `reminders/{id}` update with new fields; `notificationId` overwritten with the freshly-scheduled trigger.
- **Toast** — `bottom-toast` SHORT: `✓ Updated "<title>"`. Failure announces via `REMINDER_SCHEDULE_FAILED`.
- **Notifee** — Old trigger cancelled (`cancelReminderNotification(prev.notificationId)`), new trigger scheduled.
- **UI** — Reminders list re-renders.

### REMINDER_DELETED
- **Trigger** — Manager swipes/taps 🗑 in `RemindersScreen`. Source: [`src/screens/manager/RemindersScreen.tsx`](../src/screens/manager/RemindersScreen.tsx) `onDelete`.
- **Audience** — `SELF`.
- **Firestore** — `reminders/{id}` delete.
- **Toast** — `bottom-toast` SHORT: `Removed "<title>"`. Failure LONG: `Delete failed: <message>`.
- **Notifee** — Trigger cancelled by `notificationId`.

### REMINDER_FIRED
- **Trigger** — Android `AlarmManager` wakes Notifee at `dueDate`. Notification displays in the shade with full-screen intent.
- **Audience** — `ASSIGNEE` (the device that scheduled the trigger).
- **Firestore** — none synchronously. Optional `firedAt` is reserved in the type but not currently written.
- **Toast** — none.
- **Notifee** — Foreground delivery captured by [`src/components/ReminderAlarmHost.tsx`](../src/components/ReminderAlarmHost.tsx) via `onForegroundAlarmEvent`. Renders the in-app overlay drawn by native [`AlarmOverlayModule.kt`](../android/app/src/main/java/com/chorebuddy/AlarmOverlayModule.kt) (no-op if `Settings.canDrawOverlays` is false — see `REMINDER_PERMISSIONS_REQUESTED`). Press → deep-link to `Reminders` screen via `chorebuddy://reminder/<id>`.
- **Offline** — Trigger is OS-scheduled; fires regardless of network.
- **UI** — Overlay covers the app until dismissed; deep-link routes to the reminders screen.

### REMINDER_SCHEDULE_FAILED
- **Trigger** — `scheduleReminderNotification` returns `{ ok:false, reason }`. Sources: `NewReminderForm.submit` (`announceFailure` helper).
- **Audience** — `SELF`.
- **Reasons** —
  - `'past'` — `fireAt <= Date.now()`. The form's pre-validation should prevent this; if it slips through: `Reminder time is in the past — pick a future time`.
  - `'no-notification-perm'` — `notifee.requestPermission` returned !AUTHORIZED. Toast: `Notifications are off — open Settings to grant`.
  - `'no-exact-alarm-perm'` — `AlarmManager.canScheduleExactAlarms() === false` on Android 12+. Toast: `Exact-alarm permission is off — open Settings to grant`.
  - `'error'` — anything else. Toast: `Reminder scheduling failed: <message>`.
- **Toast** — `bottom-toast` LONG with the reason-specific message above.
- **Notifee** — none.
- **Persists** — Reminder doc is still written; only the trigger fails. User can edit + retry after granting the permission.

---

## Reward Pool flow

The Reward Pool is the per-kid screen-time catalog the manager curates. Each entry is a "X minutes of screen time for Y points" exchange. Kids redeem from their own pool only.

### REWARD_POOL_ADDED / EDITED / DELETED
- **Trigger** — Manager taps `+ New Reward` on [`src/screens/manager/RewardPoolScreen.tsx`](../src/screens/manager/RewardPoolScreen.tsx) (add), taps an existing row (edit), or taps 🗑 + confirms (delete).
- **Audience** — `SELF` + `ASSIGNEE` (passively, via the next snapshot — no notification fires).
- **Firestore** — `rewardPool/{auto}` add: `{ familyId, kidId, label, minutes, pointsCost, createdBy, createdAt }`. Updates patch the same doc; deletes remove it.
- **Toast** — `bottom-toast` SHORT on manager device: `✓ Added "<label>" to <kid>'s reward pool` / `✓ Updated "<label>"` / `Removed "<label>"`.
- **Notifee** — none.
- **UI** — Kid's `BuddyRewardsScreen` "Get screen time" tab shows the new/updated catalog entry live.

---

## Reward & claim flow

### REWARD_SUGGESTED
- **Trigger** — Buddy fills [`src/components/SuggestRewardForm.tsx`](../src/components/SuggestRewardForm.tsx) and submits. Calls `rewardService.request`.
- **Audience** — `SELF` + `MANAGERS_IN_FAMILY` (via `SubmissionToasts`).
- **Firestore** — [`src/services/rewardService.ts`](../src/services/rewardService.ts) `request`: `rewards/{auto}` add `{ familyId, kidId, title, description, suggestedCost, status:'requested', createdBy, createdAt }`.
- **Toast** —
  - Buddy device, `bottom-toast` SHORT: `✓ Sent "<title>" to manager`.
  - Manager device (any in family), `bottom-toast` SHORT via [`SubmissionToasts`](../src/components/SubmissionToasts.tsx): `🎁 <buddy> suggested "<title>" (<suggestedCost> pts)`. Buddy name resolved via `useFamilyMembers`.
- **Notifee** — none.
- **Persists** — `SubmissionToasts` uses a per-mount `wasLoading` ref (no Firestore flag), so it only toasts for transitions observed after the initial snapshot. Cold-start does not retoast.
- **UI** — Manager `BuddyRewardsScreen` shows the suggestion under **Pending → Suggestions awaiting approval**.

### REWARD_APPROVED
- **Trigger** — Manager taps **Accept** on a suggested reward and confirms. Source: [`src/screens/manager/BuddyRewardsScreen.tsx`](../src/screens/manager/BuddyRewardsScreen.tsx) → `rewardService.approve(id, suggestedCost)`.
- **Audience** — `SELF` (silent — no toast on manager). Buddy gets *no notification* — they see the reward move to **GET!** on next snapshot. **Known gap.**
- **Firestore** — `rewards/{id}` update: `{ status:'active', cost:<finalCost>, approvedAt }`.
- **Toast** — none.
- **Notifee** — none.
- **UI** — Reward shifts from Pending to **GET!** tab on the buddy's `BuddyRewardsScreen`.

### REWARD_REJECTED
- **Trigger** — Manager taps **Reject** on a suggested reward. Source: `BuddyRewardsScreen` (manager) → `rewardService.deny(id)`.
- **Audience** — `SELF` (silent). **Known gap:** buddy never learns it was rejected; the doc just disappears.
- **Firestore** — `rewards/{id}` **delete**.
- **Toast** — none.
- **Notifee** — none.
- **UI** — Suggestion row vanishes on next snapshot.

### CLAIM_REQUESTED
- **Trigger** — Buddy taps an active reward card in [`src/screens/buddy/BuddyRewardsScreen.tsx`](../src/screens/buddy/BuddyRewardsScreen.tsx) `onClaim`, confirms cost. Requires `available >= cost` (sum of approved chore points minus approved claims).
- **Audience** — `SELF` + `MANAGERS_IN_FAMILY` (via `SubmissionToasts`).
- **Firestore** — `claimService.request`: `rewardClaims/{auto}` add `{ familyId?, rewardId, kidId, rewardTitle, cost, status:'pending', claimedAt }`.
- **Toast** —
  - Buddy device, `bottom-toast` SHORT on success: `✓ Sent to manager for approval`. Insufficient balance: `Need <delta> more pts`. Failure LONG: `Failed: <message>`.
  - Manager device, via `SubmissionToasts`: `💸 <buddy> wants to claim "<rewardTitle>" (<cost> pts)`.
- **Notifee** — none.

### CLAIM_FULFILLED
- **Trigger** — Manager taps **Fulfill** on a pending claim. Source: [`src/screens/manager/BuddyRewardsScreen.tsx`](../src/screens/manager/BuddyRewardsScreen.tsx) onFulfill → `claimService.approve(claimId)` + `userService.addMinutes(kidUid, claim.minutes)`.
- **Audience** — `SELF` (manager confirmation) + `ASSIGNEE` (kid) via `useClaimResolvedNotifier`.
- **Firestore** — `rewardClaims/{id}` update: `{ status:'approved', resolvedAt }`. **AND** `users/{kidUid}` atomic merge: `{ minutesRemaining: FieldValue.increment(claim.minutes) }`. Kid-side write follows: `{ notifiedClaimant:true }`.
- **Toast** —
  - Manager device, `bottom-toast` SHORT: `✓ +<N> min added to <kid>'s wallet` (or `✓ Fulfilled "<title>"` for legacy claims without minutes).
  - Kid device, `bottom-toast` (via `toastQueue`): `🎉 +<N> min added to your screen-time wallet!` (or `🎉 "<title>" was approved!` for legacy claims).
- **Notifee** — Kid device only. Id `claim-<claimId>`, title `🎉 Reward unlocked`, body `+<N> min screen time added · "<title>"`.
- **Persists** — `notifiedClaimant=true` prevents re-fire; offline catch-up works on next sign-in.
- **Side effects (v1.40+)** — On Fulfill, the manager device additionally:
  1. Resolves the target PC list: `users/{kidUid}.assignedMachineId` if set, else every machine in `firewallControl` with matching `kidId`.
  2. Pushes `allow` to each target via `firewallControlService.send` (writes `firewallControl/{machineId}` + RTDB `firewallControl/{machineId}/control`). The Windows agent treats this as a manual override, so the schedule is paused until a `resume-schedule` push.
  3. Writes a `screenTimeBurns/{auto}` doc `{ familyId, kidId, machineIds[], expiresAt=now+minutes*60_000, claimId, minutes }`.
  4. Schedules a Notifee `burn:<burnId>` trigger on the manager's own phone for `expiresAt` so a "time's up" notification rings even if the app gets backgrounded.
- **Burn reconciliation** — [`src/hooks/useScreenTimeBurner.ts`](../src/hooks/useScreenTimeBurner.ts) (mounted in App.tsx's `ReminderSchedulerHost`) ticks every 30 s on manager devices. When a burn's `expiresAt <= now` and `!processedAt`, it marks `processedAt` then pushes `shutoff` to every `machineIds[]` entry and decrements the wallet by `minutes`. Catches lapses even when the Notifee notification fires while the manager is offline — first device back online finishes the job.
- **UI** — Kid's wallet card on `BuddyHomeScreen` + `BuddyRewardsScreen` shows updated `⏱ minutes` count live.

### CLAIM_DENIED
- **Trigger** — Manager taps **Deny** on a pending claim.
- **Audience** — `SELF` + `ASSIGNEE` (kid) via `useClaimResolvedNotifier`.
- **Firestore** — `rewardClaims/{id}` update: `{ status:'denied', resolvedAt }`. Kid-side write follows: `{ notifiedClaimant:true }`. **Points not refunded** — points were never deducted (only approved claims spend per the wallet math).
- **Toast** —
  - Manager device, `bottom-toast` SHORT: `✗ Denied "<title>"`.
  - Kid device, `bottom-toast` (via `toastQueue`): `✗ Your "<title>" request was denied`.
- **Notifee** — Kid device only. Id `claim-<claimId>`, title `✗ Request denied`, body `"<title>" was denied`.
- **Persists** — `notifiedClaimant=true`.

---

## Invite flow

### INVITE_CREATED
- **Trigger** — Manager fills [`src/components/AddBuddyForm.tsx`](../src/components/AddBuddyForm.tsx) and taps **Send Invite**. Calls `inviteService.create` which also fires `auth().sendSignInLinkToEmail` to the invitee.
- **Audience** — `SELF` + `INVITEE` (via email).
- **Firestore** — `invites/{auto}` add: `{ familyId, suggestedName, email (lowercased), role, avatar?, token (6-char), expiresAt:Date.now()+24h, createdAt, status:'pending' }`.
- **Toast** — `bottom-toast` LONG on manager device:
  - Success: `✓ Invite sent to <email>`.
  - Email delivery failed (Firestore write still succeeded): `Invite created — share the link manually (<error>)`.
- **Notifee** — none. Recipient gets a Firebase Auth email; clicking the link routes to the landing page at `https://chorebuddy-67a5f.web.app/invite?invite=<token>&email=<email>`.
- **UI** — Pending invite appears on manager's Home under **Pending Invites** and on `BuddiesScreen` invite list.

### INVITE_BANNER_SHOWN
- **Trigger** — Passive. On any signed-in user with a pending invite for their email, [`src/hooks/usePendingInviteForMe.ts`](../src/hooks/usePendingInviteForMe.ts) returns the invite; [`src/components/InviteBanner.tsx`](../src/components/InviteBanner.tsx) renders it at the top of `BuddiesScreen` (manager) or `BuddyHomeScreen` (buddy).
- **Audience** — `INVITEE`.
- **Firestore** — none (read-only).
- **Toast** — none.
- **Notifee** — none.
- **UI** — Yellow banner with **You've been invited** and a tap-to-open `AcceptInviteModal`.

### INVITE_ACCEPTED
- **Trigger** — Invitee taps **Accept** in `AcceptInviteModal`. Source: [`src/components/AcceptInviteModal.tsx`](../src/components/AcceptInviteModal.tsx) `onAccept`.
- **Audience** — `SELF` + manager (live snapshot).
- **Firestore** — Two-step:
  1. `users/{myUid}` upsert (set + merge): `{ uid, familyId:<invite.familyId>, role:<invite.role>, displayName, email, createdAt, avatar? }`.
  2. `invites/{id}` update via `inviteService.accept(id, fbUser.uid)`: `{ status:'accepted', acceptedAt, acceptedByUid }`.
- **Toast** — `bottom-toast` SHORT: `Joined family`. On step-1 failure: `Alert` with detailed context. On step-2 failure: `Alert` noting the user is joined but the invite stayed pending.
- **Notifee** — none.
- **Persists** — `acceptedAt`/`acceptedByUid` on the invite doc; the banner stops surfacing because `status !== 'pending'`.
- **UI** — User's screens re-render into the inviting family (live via `useCurrentUser` `onSnapshot`). On the manager's Home, the pending invite shows ✓ accepted.

### INVITE_DECLINED
- **Trigger** — Invitee taps **Decline** in `AcceptInviteModal`. → `inviteService.decline(id)`.
- **Audience** — `SELF`. Manager is *not* notified beyond the live snapshot status change. **Known gap.**
- **Firestore** — `invites/{id}` update: `{ status:'declined' }`.
- **Toast** — `bottom-toast` SHORT: `Invite declined`. On failure: `Couldn't decline: <message>`.
- **Notifee** — none.

### INVITE_BLOCKED
- **Trigger** — Invitee taps **Block** in `AcceptInviteModal`. → `inviteService.block(id)`.
- **Audience** — `SELF`. Manager is *not* notified.
- **Firestore** — `invites/{id}` update: `{ status:'blocked' }`.
- **Toast** — `bottom-toast` SHORT: `Sender blocked`. On failure: `Couldn't block: <message>`.

### INVITE_REVOKED
- **Trigger** — Manager taps 🗑 next to a pending invite on Home, confirms. Source: [`src/screens/manager/HomeScreen.tsx`](../src/screens/manager/HomeScreen.tsx) `Pending Invites` section.
- **Audience** — `SELF`. Invitee is *not* notified (the banner just disappears next time they refresh).
- **Firestore** — `invites/{id}` revoke (delete or status flip; check `inviteService.revoke`).
- **Toast** — none currently on this path. **Known gap.**
- **Notifee** — none.

---

## Buddy management

### BUDDY_ADDED
Alias of [`INVITE_CREATED`](#invite_created) — there is no path to create a buddy user doc directly; all buddies join the family via the invite/accept flow.

### BUDDY_EDITED
- **Trigger** — Manager opens `AddBuddyForm` with `buddy` prop and saves. Source: [`src/components/AddBuddyForm.tsx`](../src/components/AddBuddyForm.tsx) `submitEdit`.
- **Audience** — `SELF`. Edited buddy sees the change live via `useCurrentUser`/`useFamilyMembers` snapshot.
- **Firestore** — `users/{buddyUid}` update: `{ displayName, role, avatar }` via `userService.update`.
- **Toast** — `bottom-toast` SHORT: `✓ Updated <name>`.
- **Notifee** — none.

### BUDDY_REMOVED
- **Trigger** — Manager taps **Remove** (hold-to-confirm). Source: `AddBuddyForm.removeBuddy`.
- **Audience** — `SELF`. Removed user's app eventually fails Firestore reads (rules require family membership) and falls back to the auto-created-family flow next time they sign in.
- **Firestore** — `users/{buddyUid}` delete via `userService.remove`.
- **Toast** — `bottom-toast` LONG: `<name> removed from family`.
- **Notifee** — none.

---

## Permissions

### REMINDER_PERMISSIONS_REQUESTED
- **Trigger** — App boot (`App.tsx` `PermissionsBoot` component). Runs once per session via `useRef` gate.
- **Audience** — `SELF`.
- **Firestore** — none.
- **Toast** — none.
- **Notifee** — Fires the in-app Notifee `requestPermission` prompt (POST_NOTIFICATIONS on Android 13+). The other two grants (SCHEDULE_EXACT_ALARM on Android 12+, SYSTEM_ALERT_WINDOW for the overlay) cannot be prompted in-app and require the user to visit Settings → **Reminder permissions** and tap the ✗ row to deep-link to the system page.
- **Persists** — User's grant lives in OS settings, re-checked on every `AppState.active` event in `SettingsScreen` via `checkReminderPermissions`.
- **UI** — `SettingsScreen` "Reminder permissions" card shows ✓/✗ per permission, plus a **Send test reminder (10s)** button that exercises the full pipeline.

---

## Known gaps

These are paths where a user takes a meaningful action but the affected party never learns. Logged here so future sessions can treat them as a backlog rather than rediscovering them.

| Event | Gap |
|---|---|
| `CHORE_REJECTED` | Buddy gets no toast/notification. Discovers it next time they open Todo tab; red `❌ <note>` line is the only signal. |
| `REWARD_APPROVED` | Buddy gets no notification when their suggestion is accepted. Reward just appears in **GET!** tab. |
| `REWARD_REJECTED` | Doc is deleted silently. Buddy never learns their suggestion was rejected. |
| ~~`CLAIM_FULFILLED`~~ | **Resolved in v1.24** — kid now gets a queued bottom toast + Notifee `🎉 Reward unlocked` notification; minutes wallet increments live. |
| ~~`CLAIM_DENIED`~~ | **Resolved in v1.24** — kid now gets a toast + Notifee `✗ Request denied` notification. |
| `INVITE_DECLINED` / `INVITE_BLOCKED` | Manager not notified; status just changes in their pending-invites list. |
| `INVITE_REVOKED` | Invitee not notified; banner just stops showing. Also no toast on manager's own action. |
| `REMINDER_FIRED` cross-device | If the buddy's device hasn't opened the app since the reminder was created, `useReminderScheduling` has never run on their phone and the alarm won't ring. Requires per-device snapshot sync to work, which means buddy must open the app at least once between create and fire-time. |
| App-fully-killed delivery | All toasts + local notifications fail if the receiver's app is swipe-killed. Requires FCM + Cloud Function (Blaze plan, currently declined). |
| `CHORE_WEEKLY_RESET` | Doesn't clear `notifiedAssignee`. A weekly chore that was approved last week and reset to `todo` will, on its next approval, still re-notify because the submit between reset and approval clears the flag. Edge case to double-check if anyone reports a missing approval toast on weekly chores. |
| `CHORE_FORFEITED` | Uncollected approvals lapse after 30 days via `useCollectExpirySweep` (manager-side, throttled to one pass per app launch). Kid currently sees no toast or notification — chore just disappears from Collect. Surface a quiet `⚠️ N pts forfeited` toast if this becomes a complaint. |
| `BURN_SHUTOFF` cold-kill | If every manager device is swipe-killed past a burn's `expiresAt`, the PC stays unlocked until a manager opens the app. Phase 2 (Windows agent owns the burn) closes this; until then, document as known. |
| `SubmissionToasts` cold-start | Uses per-mount `wasLoading` ref instead of a Firestore flag — events that fired before the user signed in this session will NOT re-toast on next foreground. Only `usePendingChoreNotifier` and `useApprovedChoreNotifier` survive cold-start via the `notified*` flags on chore docs. |

---

## Maintenance pointer

When updating this file, the source of truth lives in:

- Notifier hooks: `src/hooks/usePendingChoreNotifier.ts`, `src/hooks/useApprovedChoreNotifier.ts`, `src/hooks/useReminderScheduling.ts`, `src/hooks/useChoreReminderScheduling.ts`.
- Global toast watcher: `src/components/SubmissionToasts.tsx`.
- Toast queue: `src/utils/toastQueue.ts`.
- Notification service: `src/services/notificationService.ts`.
- Firestore rules (audience permissions): `firestore.rules`.

Add new events at the top of the relevant flow section and the TOC. Don't rename existing events without grepping for references in this file and in the linked code.
