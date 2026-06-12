# ChoreBuddy — Onboarding for a fresh chat session

You're a new Claude session being asked to work on ChoreBuddy. Read this
file first, then the linked docs in order. After ~10 minutes you'll
know enough to take a feature request without asking the user to
re-explain anything.

---

## Read this stack, in order

1. **This file** — orientation + read order.
2. [`HANDOFF-2026-06-11.md`](./HANDOFF-2026-06-11.md) — the master doc.
   Architecture, code locations, Firebase project IDs, OAuth secrets
   layout, distribution channels, what's built, build/ship cheatsheets,
   known traps, open work. ~350 lines. **This is the single most
   important file.**
3. [`RELEASING.md`](./RELEASING.md) — exact commands to push a mobile or
   agent update. Includes the `gh` CLI path quirk (it's not on PATH),
   the active branch (`claude/full-port`, not `main`), and the watchdog
   trap that locks the agent .exe during rebuild.
4. [`docs/EVENT_FLOWS.md`](./docs/EVENT_FLOWS.md) — canonical spec for
   every toast / notification / state transition. Cross-references the
   notifier hooks. If you touch a notification, update this.
5. [`firestore.rules`](./firestore.rules) — security model. Read once to
   understand what writes are allowed from whom.
6. [`HANDOFF.md`](./HANDOFF.md) — older history (v1.1–v1.13). Skim only
   if the master handoff references something you don't recognize.

Then run `git log --oneline -30` in `C:\ChoreBuddy` and in
`C:\Users\NWI - E02\Desktop\ChoreBuddy-Agent` to see the last 30
commits in each repo. That tells you what shipped recently.

---

## TL;DR — the shape of the project

Three pieces:

- **Mobile app** — React Native Android, sideloaded via GitHub Releases.
  Source at `C:\ChoreBuddy`. Repo
  `adrockisahussla/ChoreBuddy`, branch `claude/full-port`.
- **Windows agent** — .NET 8 service running on a kid's PC. Source at
  `C:\Users\NWI - E02\Desktop\ChoreBuddy-Agent`. Repo
  `adrockisahussla/ChoreBuddy-Agent`. Self-updates hourly from its own
  releases page.
- **Firebase backend** — project `chorebuddy-67a5f`. Firestore (data +
  rules), Realtime Database (push command channel to the agent),
  Auth (Google sign-in), Hosting (`/invite` landing page).

Three currencies in series — chores → POINTS → MINUTES → screen time:
- Kid completes chores → manager approves → kid taps **Collect** to
  bank points (uncollected approvals expire in 30 days).
- Kid spends points on **Reward Pool** items the manager curated
  (X minutes of screen time for Y points).
- Manager **Fulfills** a claim → app pushes `allow` to the kid's PC
  via RTDB → schedules a SHUTOFF for `now + minutes`. PC re-blocks
  automatically when time runs out.

The agent's `firewallControl` channel is what makes screen-time real.
Manual block/allow always trumps the schedule until a `resume-schedule`
push.

---

## Project rules / preferences

- **Terse responses by default.** 1–3 sentences, point form. Skip
  recap paragraphs and option tables unless the user asks.
- **Buddy/manager UI parity.** When the user asks for a UI change,
  surface the counterpart screen upfront so we change both at once.
- **Auto mode on.** Make reasonable calls without stopping to ask; the
  user will redirect if needed. Still ask when genuinely blocked.
- **Active branch is `claude/full-port`.** Never push to `main` without
  explicit instruction.
- **Don't commit unless asked.** Build and ship steps are explicit user
  actions.

---

## When the user says "ship it" or "push"

The two-line answer:
```bash
cd /c/ChoreBuddy/android && ./gradlew assembleRelease
# then bump version, tag, gh release create — see RELEASING.md step-by-step
```

For the agent: bump `AgentUpdater.CurrentVersionString` + `csproj`
`<Version>`, kill the watchdog before building, ship via Inno Setup +
zip — see `RELEASING.md`.

---

## What's currently live (2026-06-12)

- Mobile **v1.40** — latest release: per-kid PC binding, Phase 1
  screen-time burner (manager phone owns the SHUTOFF timer until Phase
  2 moves it into the agent), 30-day Collect expiry.
- Agent **v1.0.2** — push-driven schedule reload + pause/resume,
  manager-triggered self-update via RTDB.

Open work and known gaps live in the master handoff's "Open work"
section.

---

That's it. Open `HANDOFF-2026-06-11.md` next.
