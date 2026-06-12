# RELEASING — how to push a ChoreBuddy update

Quick reference for shipping a new build of either app. For the deeper
architecture + Firebase project IDs, see `HANDOFF-2026-06-11.md`.

---

## Where the code lives

| Surface | Repo / path | Notes |
|---|---|---|
| **Mobile app** (React Native APK) | `C:\ChoreBuddy` · GitHub: `adrockisahussla/ChoreBuddy` · branch `claude/full-port` | The branch in active use is `claude/full-port`, **not** `main`. |
| **Windows agent** (.NET service + watchdog) | `C:\Users\NWI - E02\Desktop\ChoreBuddy-Agent` · GitHub: `adrockisahussla/ChoreBuddy-Agent` | Inno Setup installer lives at `installer\ChoreBuddyAgent.iss`. |
| **Landing page** (`/invite`, `/agent`) | `C:\ChoreBuddy\public\*.html` + `firebase.json` | Deployed via `firebase deploy --only hosting`. |
| **Firestore rules** | `C:\ChoreBuddy\firestore.rules` | Deployed via `firebase deploy --only firestore:rules`. |

GitHub Releases is the distribution channel for both apps:
- Mobile: `https://github.com/adrockisahussla/ChoreBuddy/releases/latest`
- Agent: `https://github.com/adrockisahussla/ChoreBuddy-Agent/releases/latest`

The agent's hourly self-update poll fetches from the agent repo's
`/releases/latest/download/ChoreBuddyAgent.zip` URL.

---

## Tooling notes (read before you ship)

- **`gh` CLI is not on PATH.** It's stashed at
  `C:\Users\NWI - E02\AppData\Local\Temp\gh-cli\bin\gh.exe`. Always
  invoke it by absolute path, or alias once per shell.
- **Firebase CLI** is on PATH (`firebase`). Already authed.
- **Java / Gradle** wrapper lives in `C:\ChoreBuddy\android\gradlew.bat`.
  Use Git Bash so `./gradlew assembleRelease` works directly.
- **Active branch is `claude/full-port`** — push commits and tags there,
  not `main`.

---

## Mobile app — ship a new APK

1. **Bump version.** Edit `C:\ChoreBuddy\android\app\build.gradle`:
   ```gradle
   versionCode <last + 1>
   versionName "<x.y>"
   ```
2. **Typecheck** (optional but cheap — surfaces broken imports before a
   60s build):
   ```bash
   cd /c/ChoreBuddy && npx tsc --noEmit
   ```
   Four pre-existing errors in `StatCard.tsx` and `BuddyScheduleScreen.tsx`
   are background noise — ignore.
3. **Build the release APK** (~70 s on this machine):
   ```bash
   cd /c/ChoreBuddy/android && ./gradlew assembleRelease
   ```
   Output: `android\app\build\outputs\apk\release\app-release.apk` (~80 MB).
   Signing is automatic: release keystore creds come from
   `gradle.properties` (gitignored); falls back to the debug keystore if
   the props are absent, so the app installs over previous versions on
   the same device only when the keystore matches.
4. **Commit + tag + push:**
   ```bash
   cd /c/ChoreBuddy
   git add -A
   git commit -m "vX.Y: <summary>"
   git tag -a vX.Y -m "vX.Y — <summary>"
   git push origin claude/full-port
   git push origin vX.Y
   ```
5. **Cut the GitHub release + upload APK** (PowerShell):
   ```powershell
   $gh = "C:\Users\NWI - E02\AppData\Local\Temp\gh-cli\bin\gh.exe"
   Set-Location C:\ChoreBuddy
   & $gh release create vX.Y `
     "android\app\build\outputs\apk\release\app-release.apk#ChoreBuddy-vX.Y.apk" `
     --title "vX.Y" `
     --notes "<markdown release notes>"
   ```
   The `#ChoreBuddy-vX.Y.apk` suffix renames the asset on the release
   page so sideloaders don't get a generic `app-release.apk`.
6. **(If rules changed)** Deploy Firestore rules:
   ```bash
   cd /c/ChoreBuddy && firebase deploy --only firestore:rules
   ```
7. **(If `public/*.html` or `firebase.json` changed)** Deploy hosting:
   ```bash
   cd /c/ChoreBuddy && firebase deploy --only hosting
   ```

**Users update by:** opening the invite page
(`https://chorebuddy-67a5f.web.app/invite`) and tapping **Download APK**,
or going straight to the releases page. No in-app update prompt yet.

---

## Windows agent — ship a new build

The agent self-updates hourly, so any release tagged later than the
agent's `CurrentVersionString` propagates within an hour without user
action. Push to update sooner via the **🚀 Update all PCs** button in
GameWall (sends `update` over RTDB; v1.0.1+ agents react instantly).

1. **Bump version in two places:**
   - `src\ChoreBuddy.TestApp\AgentUpdater.cs`:
     ```csharp
     public const string CurrentVersionString = "1.0.X";
     ```
   - `src\ChoreBuddy.TestApp\ChoreBuddy.TestApp.csproj`:
     ```xml
     <Version>1.0.X</Version>
     ```
2. **Stop the watchdog + service before rebuilding** — the watchdog
   auto-restarts the service within 60 s and locks the .exe, breaking
   `dotnet build`:
   ```powershell
   Unregister-ScheduledTask -TaskName ChoreBuddyAgentWatchdog -Confirm:$false
   Stop-Service ChoreBuddyAgent
   Stop-Process -Name ChoreBuddy.TestApp -Force -ErrorAction SilentlyContinue
   ```
3. **Build the binary:**
   ```powershell
   cd "C:\Users\NWI - E02\Desktop\ChoreBuddy-Agent\src\ChoreBuddy.TestApp"
   dotnet publish -c Release -r win-x64 --self-contained false -o ..\..\dist-1.0.X
   ```
4. **Build the installer EXE** (single-file Inno Setup):
   ```powershell
   $iscc = "C:\Users\NWI - E02\AppData\Local\Programs\Inno Setup 6\ISCC.exe"
   & $iscc "C:\Users\NWI - E02\Desktop\ChoreBuddy-Agent\installer\ChoreBuddyAgent.iss"
   ```
   Output: `installer\Output\ChoreBuddyAgentSetup.exe`.
5. **Zip the publish folder** (the hourly self-update consumes the zip):
   ```powershell
   Compress-Archive -Path "..\..\dist-1.0.X\*" `
                    -DestinationPath "..\..\dist-1.0.X\ChoreBuddyAgent.zip" -Force
   ```
   Make sure `setup.cmd` is in `dist-1.0.X\` before zipping — easy to
   miss, breaks first-time installs.
6. **Commit + tag + push (agent repo):**
   ```bash
   cd "C:/Users/NWI - E02/Desktop/ChoreBuddy-Agent"
   git add -A && git commit -m "agent v1.0.X: <summary>"
   git tag -a v1.0.X -m "v1.0.X"
   git push origin main
   git push origin v1.0.X
   ```
7. **Cut the GitHub release + upload BOTH artifacts:**
   ```powershell
   $gh = "C:\Users\NWI - E02\AppData\Local\Temp\gh-cli\bin\gh.exe"
   Set-Location "C:\Users\NWI - E02\Desktop\ChoreBuddy-Agent"
   & $gh release create v1.0.X `
     "dist-1.0.X\ChoreBuddyAgent.zip" `
     "installer\Output\ChoreBuddyAgentSetup.exe" `
     --title "Agent v1.0.X" --notes "<notes>"
   ```
   The `.zip` is the hourly self-update payload (filename must stay
   `ChoreBuddyAgent.zip`); the `.exe` is the user-facing installer.
8. **Re-arm the watchdog on this dev machine** if you want the agent
   running locally again:
   ```powershell
   Start-Service ChoreBuddyAgent
   # Recreate the scheduled task if you rely on it for dev testing.
   ```

---

## Firestore rules / hosting only (no app rebuild)

```bash
cd /c/ChoreBuddy
firebase deploy --only firestore:rules
firebase deploy --only hosting
firebase deploy --only firestore:rules,hosting    # both at once
```

---

## Sanity-check after a release

- Open the release page in a browser; confirm the asset filenames and
  sizes look right.
- For mobile: sideload the new APK on a test device, check the
  versionName in the header overflow shows the new value.
- For agent: on a paired PC, open Event Viewer → ChoreBuddyAgent
  source, look for `AgentUpdater: pulled 1.0.X` within ~60 min, or
  trigger immediately via **🚀 Update all PCs**.
- If rules changed, verify in the Firebase console that the rule version
  jumped (Firestore → Rules → History).

---

## Common traps

- **Forgot to bump `versionCode`.** Android refuses to install over a
  build with the same code. Always increment.
- **Watchdog locks the agent .exe** during rebuild. Always
  `Unregister-ScheduledTask` first.
- **gh CLI not on PATH.** Use the absolute path above or alias it.
- **Pushed to `main` instead of `claude/full-port`.** No CI is wired to
  it; CI fires nothing if the branch is wrong. Worse, future pulls miss
  your work. Double-check `git push origin claude/full-port` for mobile.
- **`firebase.json` rewrites point at things that don't exist.** Use
  `redirects` (with `type: 302`) for external URLs; `rewrites` is
  internal-only.
- **Release keystore creds missing.** Build still succeeds — the APK is
  signed with the debug keystore. Users on previous-release devices then
  can't install over it (signature mismatch). Confirm
  `gradle.properties` has `CHOREBUDDY_RELEASE_*` set.
