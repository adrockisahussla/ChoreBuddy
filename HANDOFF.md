# ChoreBuddy — Handoff for Next Session

> **Event/notification spec:** `docs/EVENT_FLOWS.md` is the canonical reference for every event in the app — who triggers it, who's notified, exact toasts/Firestore writes/persistence flags. Update it whenever you change a notifier or toast.


**Last updated:** 2026-05-23
**Working dir:** `C:\ChoreBuddy` (also `C:\Users\NWI - E02\Desktop\ChoreBuddy` is the project root for Claude Code's CWD — same files via different mount; CWD is the Desktop path)
**Current shipping APK:** v1.13 (`versionCode 14`)

---

## TL;DR — what this session built

A family chore-tracking React Native (Android-only for now) app that sideloads via GitHub Releases. This session locked down its Firebase, restructured the data model around uid-keyed user docs, added an in-app invite-accept flow, an in-app updater, a chore-pending notification path, FAB-based chore/reminder creation, and a checkbox UI for resolving chores.

---

## Git state

- **Remote:** `https://github.com/adrockisahussla/ChoreBuddy` (PUBLIC)
- **Branch:** `claude/full-port`
- **HEAD:** `58da6e4` ("Per-device reminder scheduling so buddies actually get alarms")
- **Working tree:** large amount of uncommitted modified + new files. Nothing in this session has been committed — every shipped APK was built directly from the uncommitted working tree.
- The git log shows lots of *pre-existing* uncommitted state from earlier sessions (entire screens rewritten, etc.). Don't assume HEAD reflects what's running.

### Files added this session (untracked)
- `firestore.rules` + `firebase.json` (firestore rules config)
- `accept-invite-preview.html` (HTML mockup throwaway)
- `scripts/migrate-users-to-uid-id.js` — one-time admin SDK migration (ALREADY RUN; safe to re-run, idempotent)
- `scripts/inspect-user.js` — debug helper
- `scripts/service-account-key.json` — **DO NOT COMMIT** (gitignored)
- `src/components/AcceptInviteModal.tsx`
- `src/components/InviteBanner.tsx`
- `src/components/ChoreFormSheet.tsx`
- `src/components/FAB.tsx`
- `src/hooks/usePendingInviteForMe.ts`
- `src/hooks/usePendingChoreNotifier.ts`
- `src/services/updateService.ts`
- `src/config/appCheck.ts` (currently NOT called — disabled in App.tsx)
- `android/app/src/main/java/com/chorebuddy/ApkUpdaterModule.kt` + `ApkUpdaterPackage.kt`
- `android/app/src/main/res/xml/file_provider_paths.xml`

### Files modified this session
- `firestore.rules`, `firebase.json`, `.gitignore`
- `App.tsx` — wires `usePendingChoreNotifier`, commented-out App Check init
- `package.json` — added `@react-native-firebase/app-check`
- `android/app/build.gradle` — versionCode 14, versionName "1.13"
- `android/app/src/main/AndroidManifest.xml` — `REQUEST_INSTALL_PACKAGES` perm + FileProvider
- `android/app/src/main/java/com/chorebuddy/MainApplication.kt` — registers ApkUpdaterPackage
- `src/types.ts` — `InviteStatus` adds `'declined' | 'blocked'`
- `src/services/inviteService.ts` — `decline()`, `block()` methods + `acceptedByUid` field
- `src/services/userService.ts` — uid-as-doc-id, `getByUid`/`createForNewSignIn`/`joinFamily` rewritten, added `upsert()`
- `src/services/notificationService.ts` — `notifyChoreSubmittedForApproval()`
- `src/hooks/useCurrentUser.tsx` — live `onSnapshot` for user doc, no more silent auto-join
- `src/screens/manager/BuddiesScreen.tsx` — InviteBanner at top
- `src/screens/manager/BuddyChoresScreen.tsx` — FAB + ChoreFormSheet + checkbox UI
- `src/screens/manager/RemindersScreen.tsx` — FAB replaces "+ New Reminder" button
- `src/screens/manager/SettingsScreen.tsx` — App version card + footer
- `src/screens/buddy/BuddyHomeScreen.tsx` — InviteBanner at top
- `src/screens/buddy/BuddyChoresScreen.tsx` — FAB + ChoreFormSheet + checkbox UI
- `public/invite.html` — `?invite=` param read + Android Chrome escape-hatch box
- `index.js` (minor; check diff)

---

## Firebase

- **Project ID:** `chorebuddy-67a5f`
- **Plan:** Spark (free). App Check init code exists in `src/config/appCheck.ts` but is **commented out** in `App.tsx`. Enabling it requires Play Integrity API to be enabled in Google Cloud Console (otherwise Firestore writes fail with a confusing "caller doesn't have permission" error — already verified).
- **Hosting:** `https://chorebuddy-67a5f.web.app/invite` serves `public/invite.html`.
- **Firestore rules:** local file `firestore.rules` is authoritative — `firebase deploy --only firestore:rules` pushes it. Currently strict: family-scoped reads/writes, email-case-insensitive invite match.
- **App Check:** Registered for the ChoreBuddy Android app (SHA-256: `A4:1E:B2:41:C6:E2:EF:C4:59:18:31:EF:BE:5C:36:25:ED:E7:A6:96:92:89:D2:ED:5E:95:19:18:15:6F:90:9D`) with Play Integrity. **Not enforced** in console.
- **Auth users (4):**
  - `adam.vandyck@gmail.com` (uid `ivyX5bpuY8MxnVhLbMmP0JlRsgl1`) — the main manager
  - `adrock.berocked@gmail.com` (uid `piBJGxiKmgObrufwYphWleJw5ku2`) — test co-manager
  - `dreysonadam69@gmail.com`, `charberrycrunch@gmail.com` — Auth-only, no Firestore docs (pre-broken-invite era)
- **Service account key** for admin scripts: `scripts/service-account-key.json` (gitignored; user manually placed it).

---

## Data model

### Collections + rules

| Collection | Key | Rule summary |
|---|---|---|
| `users/{uid}` | uid | self read/write; same-family read |
| `families/{auto}` | auto | members of the family can read/write; create requires `createdBy == auth.uid` |
| `chores`, `chorePool`, `rewards`, `rewardClaims`, `reminders` | auto | read/write if `resource.data.familyId == myUser().familyId` |
| `invites/{auto}` | auto | family members read/write, OR invitee email read/write (case-insensitive) |
| `firewallControl/{machineId}` | machineId | any `role==manager` user can read/write |

### Key invariants
- User doc id == Firebase Auth uid (post-migration). All code now uses `usersCol().doc(uid).set/get/update`.
- `useCurrentUser` subscribes to the user doc via `onSnapshot` — local state stays live with Firestore changes (so accept-invite, role change, etc. propagate without restart).
- Removed silent auto-join. New users always become managers of a fresh family on first sign-in. Pending invites surface via the in-app `InviteBanner` on BuddiesScreen/BuddyHomeScreen.

---

## Release history (this session)

| Ver | What landed |
|---|---|
| v1.1 | (pre-session) APK first published |
| v1.2 | Migration + uid-keyed users + App Check code (then disabled) |
| v1.3 | In-app accept invite banner |
| v1.4 | Debug alerts on accept (later removed) |
| v1.5 | Disable App Check init in App.tsx |
| v1.6 | `userService.upsert()` — accept works even if user doc missing |
| v1.7 | `useCurrentUser` switched to live `onSnapshot` |
| v1.8 | FAB + ChoreFormSheet on chore pages, FAB replaces "+ New Reminder" |
| v1.9 | FAB position tweak (left → right per user) |
| v1.10 | In-app updater (Settings → App version → Check for update → Download & install). Native `ApkUpdater` Kotlin module + FileProvider |
| v1.11 | Version footer in Settings |
| v1.12 | FAB back to bottom-right; `usePendingChoreNotifier` — manager local notif on submission |
| v1.13 | Chore rows use empty-checkbox UX; status pills removed |

All releases are at `https://github.com/adrockisahussla/ChoreBuddy/releases`. Download URL pattern: `…/releases/latest/download/ChoreBuddy.apk` (always points at the newest published release).

---

## Open work

1. **Enable App Check enforcement** in Firebase Console once Play Integrity API is enabled in Google Cloud. Then uncomment `initializeAppCheck()` in `App.tsx` and ship a new APK.
2. **Push notifications** — current chore-pending notif is local-only (manager's app must be running, even backgrounded). Real wake-the-phone push needs FCM + Cloud Function on Blaze plan.
3. **Commit the working tree** — lots of unreviewed changes from this and earlier sessions are uncommitted. PR opportunity once user confirms everything is stable.
4. **App Check Play Integrity API** — needs enabling at `https://console.cloud.google.com/apis/library/playintegrity.googleapis.com?project=chorebuddy-67a5f`.
5. **Windows firewall agent auth** — the desktop agent that polls `firewallControl` needs its own auth strategy now that rules require `role==manager`. Currently agent runs anonymously; will be blocked.
6. **Update CLI** — `claude` is on `2.1.89` locally; latest is `2.1.145`. Run `winget upgrade Anthropic.ClaudeCode` in PowerShell.

---

## Build + ship cheat-sheet

```bash
# Build APK
cd /c/ChoreBuddy/android && ./gradlew assembleRelease

# Upload as new GitHub release (rename via temp copy because gh's #rename glob is unreliable on Windows bash)
cp /c/ChoreBuddy/android/app/build/outputs/apk/release/app-release.apk /tmp/ChoreBuddy.apk
"/c/Users/NWI-E0~1/AppData/Local/Temp/gh-cli/bin/gh.exe" release create vX.Y \
  --repo adrockisahussla/ChoreBuddy \
  --title "ChoreBuddy vX.Y" \
  --notes "…" \
  /tmp/ChoreBuddy.apk

# Deploy Firestore rules
cd /c/ChoreBuddy && firebase deploy --only firestore:rules

# Deploy landing page
cd /c/ChoreBuddy && firebase deploy --only hosting

# Inspect Firestore
cd /c/ChoreBuddy && node scripts/inspect-user.js <uid>

# Bump version before build
# android/app/build.gradle: versionCode + versionName
```

Portable `gh` lives at `C:\Users\NWI-E0~1\AppData\Local\Temp\gh-cli\bin\gh.exe`, authenticated to `adrockisahussla`. The system `gh` is not on PATH — always use the portable path.

---

## User preferences (from memory)

- Default to **1-3 sentence** responses. Skip recap paragraphs, option tables, redundant headers.
- When making a UI change, **surface the buddy/manager counterpart screen upfront** so we change both at once.
- Alarm permissions: three Android 14+ toggles must be user-granted or reminder alarms silently degrade to heads-up.

---

## Known traps for the next agent

- **Don't trust git HEAD** — it lags behind the working tree by a lot. Read actual files in `/c/ChoreBuddy/src/...` to know current behavior.
- **`request.auth.token.email` vs `resource.data.email` is case-sensitive in rules.** Already wrapped with `.lower()` everywhere.
- **`set + merge` not `update`** when writing user docs from the accept-invite flow — the doc may not exist and `update` returns permission-denied on missing docs.
- **APK asset naming**: `gh release create … file.apk#NewName.apk` does NOT reliably rename on Windows bash. Copy to a temp file with the desired name first, then upload.
- **App Check init causes Firestore permission-denied errors** if Play Integrity isn't enabled. Keep `initializeAppCheck()` commented in `App.tsx` until that's set up.
- **In-app browser blocks APK downloads** (Gmail webview). Landing page has a yellow "Open in Chrome" escape hatch always shown on Android.
- **Snapshot listeners + onSnapshot in useCurrentUser**: `snap.exists` is a function in RN Firebase v24, must call as `snap.exists()`. Same for `userService.getByUid`.
