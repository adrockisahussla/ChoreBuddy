# ChoreBuddy handoff — buddy-app parity in the RN codebase

**Date:** 2026-05-13
**Branch:** `claude/full-port`
**Working tree:** clean
**Phone:** Samsung Galaxy (R5CXC1E98KN), `adb` at `C:\Android\Sdk\platform-tools\adb.exe`

## Context for the next session

The standalone `C:\Users\NWI - E02\Desktop\ChoreBuddy\buddy-app.html` was a single-file mock of the buddy experience. We've been folding it into the React Native manager codebase so both roles share one app, one design system, one auth flow. That work is mostly done; what remains is mostly cleanup and one verification (alarms actually firing on the buddy's phone).

## What landed (most recent → older)

| Commit | What |
|---|---|
| `58da6e4` | `useReminderScheduling` hook in `src/hooks/`. Per-device sync — every signed-in device schedules its own local Notifee triggers for reminders assigned to it. Mounted via `ReminderSchedulerHost` in `App.tsx` inside `AuthGateway`. Stable id `reminder:<docId>`; stale triggers cancelled. |
| `b3a0f5f` | `RemindersScreen` filter `matchesAssignee` — legacy reminders (saved before `6cad0cd`'s `assignedTo` bugfix) had `assignedTo: undefined`; the buddy filter now treats those as "for everyone in the family" so they don't vanish. Empty state is diagnostic: `"No reminders for you yet."` vs `"No reminders this week (N on other weeks)."` |
| `4e0e4b4` | Buddy screens aligned visually with manager: `BuddyRewardsScreen` hero is now `StatCard variant="brand"`, reward rows simplified; `BuddyHomeScreen` got the "You" identity strip; `BuddyChoresScreen` pts bubble + rejection-note + OVERDUE tags now all use shared `Pill` component. |
| `6e4806e` | `BuddyHomeScreen` rebuilt to use stacked `StatCard`s matching manager Home pattern (was 2×2 grid + custom hero). |
| `23324b0` | New `BuddyChoresScreen` and `BuddyRewardsScreen` under `src/screens/buddy/`. Drawer `ITEM.buddyOnly` flag introduced. |
| `db2e2b7` | Drawer `SafeAreaView` switched to `react-native-safe-area-context` so Sign Out clears the Android gesture bar. |
| `2e02e04` | Role-aware navigator. Reads `userDoc.role`. Buddy drawer shows Home / My Chores / Reminders / Rewards / Settings; manager unchanged. `RemindersScreen` is now role-aware (buddy: own reminders, no "+ New", no delete, no tap-to-edit). |

## Current state of the buddy view

Files under `C:\ChoreBuddy\src\screens\buddy\`:
- `BuddyHomeScreen.tsx` — "You" identity strip, 5 stacked StatCards (Available Points / Today's Chores / Weekly Progress / Reminders / Available Rewards), Recent Activity
- `BuddyChoresScreen.tsx` — WeekNavigator, summary card with pts Pill, three sections (To do / Waiting / Done)
- `BuddyRewardsScreen.tsx` — Wallet section with brand StatCard, Available Rewards list, Recent Claims with status palette

Manager side untouched.

## Open threads / what's next

1. **Verify the buddy alarm actually fires.** Create a reminder ~2 min in the future from a manager account assigned to a buddy. Sign in as that buddy on the phone. Wait. Notifee should fire and `ReminderAlarmHost` should pop the full-screen monster overlay (`src/components/ReminderAlarm.tsx`). Untested as of this handoff.

2. **Retire `buddy-app.html`.** Once #1 confirms the RN buddy view covers everything, delete `C:\Users\NWI - E02\Desktop\ChoreBuddy\buddy-app.html`. The local Python http.server (background task `b9ryhcz57`) can be killed too.

3. **Recurring reminder re-arming.** Currently `useReminderScheduling` only schedules where `dueDate > now`. Daily/weekly recurrences need a sweep that re-arms after each fire. Probably a Firestore Cloud Function, or a buddy-side reschedule on the next reminders snapshot.

4. **Snooze in `ReminderAlarm`.** The overlay has a Snooze button but the 5-min reschedule logic was never wired up. Add it via `scheduleReminderNotification` with `fireAt = Date.now() + 5*60*1000`.

5. **Full-screen reminder toggle in Settings.** Add a switch under `SettingsScreen.tsx` for "Alarm-style reminders" → if on, set `android.fullScreenAction` on the trigger payload in `notificationService.ts:scheduleReminderNotification`.

6. **Backfill orphaned reminders.** A one-shot script that finds reminders with `assignedTo: undefined` and either deletes them or has the manager pick a buddy to reassign. Not blocking — workaround in `b3a0f5f` shows them to everyone.

7. **Manager-side polish opportunities** (audit from earlier in the session, not yet acted on):
   - Manager `BuddyChoresScreen` action buttons are 30×30; buddy uses 40×40. Standardize to 40.
   - Manager `BuddyRewardsScreen` has no points hero — could add one for symmetry.

## Critical files

- `App.tsx` — root tree with `TextScaleProvider`, `AuthGateway`, `ReminderAlarmHost`, `ReminderSchedulerHost`
- `src/navigation/DrawerNavigator.tsx` — role-aware drawer
- `src/screens/buddy/*.tsx` — three buddy screens
- `src/screens/manager/RemindersScreen.tsx` — role-aware single file
- `src/components/Text.tsx` — `Text` wrapper, applies `scaleFont` + `allowFontScaling=false`
- `src/components/StatCard.tsx` — `variant="brand"` is the pink-hero version used by both Home screens
- `src/components/Pill.tsx` — used by buddy chores for status chips
- `src/context/TextScaleContext.tsx` — in-app font-size slider state
- `src/utils/textScale.ts` — module-level scale store
- `src/hooks/useReminderScheduling.ts` — per-device alarm sync (new)
- `src/services/notificationService.ts` — Notifee wrapper
- `src/services/reminderService.ts` — Firestore CRUD
- `src/types.ts` — `User.role`, `User.textScale`, `Reminder.weekdays`, `Chore.weekdays`

## Recipes / commands

**Push fresh bundle to phone**
```
"/c/Android/Sdk/platform-tools/adb.exe" reverse tcp:8081 tcp:8081 \
  && curl -s -o NUL -w "reload: %{http_code}\n" http://localhost:8081/reload \
  && "/c/Android/Sdk/platform-tools/adb.exe" shell am force-stop com.chorebuddy \
  && "/c/Android/Sdk/platform-tools/adb.exe" shell monkey -p com.chorebuddy -c android.intent.category.LAUNCHER 1
```

**Snap screen** → `powershell -ExecutionPolicy Bypass -File C:/ChoreBuddy/scripts/snap.ps1 -Out C:/temp/snaps/x.png`

**Typecheck** (ignore pre-existing StatCard warning) → `cd /c/ChoreBuddy && npx tsc --noEmit 2>&1 | grep -v StatCard`

**Device state checks**
- `adb shell settings get system font_scale` — 1.0 is default
- `adb shell wm density` — `Physical density: 450` is the phone's native; `Override density: 540` means Samsung Screen Zoom is bumped up
- `adb shell wm density reset` — reset to native (we used this; user wanted it back at 540 for comfort, restored)

## Known issues / gotchas

- **`StatCard.tsx` pre-existing TypeScript error** (line 35): `false | { color: string }` not assignable to `TextStyle`. Harmless at runtime, ignore in typecheck filter.
- **`ReminderAlarmHost` only fires when the app is in the foreground** when the notification delivers. Background firing needs Notifee `onBackgroundEvent` registration — not wired up yet.
- **The `buddy-app.html` Python http.server** is still running in the background (task id `b9ryhcz57`). Kill or leave; it doesn't affect anything else.
- **Phone has display zoom override** (540 vs native 450). The user is fine with that — design uses `scaleFont` for in-app font scaling instead of fighting the OS.

## Conversation summary

This session: aligned the buddy app into the manager codebase, fixed the legacy-reminder visibility bug, and wired per-device alarm scheduling. Earlier in the session: built `BuddyPicker` (multi-select), `DayOfWeekPicker` (multi-select with presets), `RecurrencePicker`, gestures fix on bottom-sheet wheels, in-app text-scale Settings, and a brief Figma component-recreation exercise.
