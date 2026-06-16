import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const RTDB_URL = 'https://chorebuddy-67a5f-default-rtdb.firebaseio.com';

export interface Machine {
  id: string;
  machineName?: string;
  kidId?: string;
  command?: 'shutoff' | 'allow';
  timestamp?: number;
  lastSeenAt?: number;
}

/** Push the command to RTDB (the channel the PC agent listens on) — instant. */
async function pushRtdb(
  machineId: string,
  cmd: 'shutoff' | 'allow' | 'update' | 'reload-schedule' | 'resume-schedule' | 'message',
  ts: number,
  extra?: Record<string, any>,
) {
  const u = auth().currentUser;
  if (!u) throw new Error('Not signed in');
  const token = await u.getIdToken();
  const url = `${RTDB_URL}/firewallControl/${encodeURIComponent(machineId)}/control.json?auth=${token}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: cmd, timestamp: ts, ...(extra || {}) }),
  });
  if (!r.ok) throw new Error(`RTDB ${r.status}: ${await r.text()}`);
}

export const firewallControlService = {
  /** Live list of machines paired to a given buddy. */
  subscribeForKid: (kidId: string, cb: (m: Machine[]) => void) =>
    firestore().collection('firewallControl').onSnapshot(
      s => cb(
        s.docs
          .map(d => ({ id: d.id, ...(d.data() as any) } as Machine))
          .filter(m => m.kidId === kidId),
      ),
      () => cb([]),
    ),

  /** Live list of ALL machines across the family — used by "Update all". */
  subscribeAll: (cb: (m: Machine[]) => void) =>
    firestore().collection('firewallControl').onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Machine))),
      () => cb([]),
    ),

  /** Fire the manager-triggered self-update on every paired PC. Agents
   *  on v1.0.1+ recognize this and pull the newest release from GitHub
   *  within seconds; older agents ignore it and pick up via their
   *  hourly self-poll. */
  updateAll: async (machines: Machine[]) => {
    const ts = Date.now();
    let ok = 0, fail = 0;
    for (const m of machines) {
      try { await pushRtdb(m.id, 'update', ts); ok++; }
      catch { fail++; }
    }
    return { ok, fail };
  },

  /** Fan out a `reload-schedule` push to every PC paired with this kid.
   *  Agents on v1.0.2+ refetch gameSchedules/{kidId} once. Quota cost is
   *  ~1 Firestore read per machine per schedule edit. Does not unpause
   *  the enforcer on the agent side. */
  pushReloadForKid: async (kidId: string) => {
    const snap = await firestore().collection('firewallControl')
      .where('kidId', '==', kidId).get();
    const ts = Date.now();
    let ok = 0, fail = 0;
    for (const d of snap.docs) {
      try { await pushRtdb(d.id, 'reload-schedule', ts); ok++; }
      catch { fail++; }
    }
    return { ok, fail };
  },

  /** Push `resume-schedule` — clears the agent's SchedulePaused flag and
   *  re-evaluates the active rule immediately. Use when the manager wants
   *  the schedule to take over after a manual Block-now / Allow-now. */
  pushResumeForKid: async (kidId: string) => {
    const snap = await firestore().collection('firewallControl')
      .where('kidId', '==', kidId).get();
    const ts = Date.now();
    let ok = 0, fail = 0;
    for (const d of snap.docs) {
      try { await pushRtdb(d.id, 'resume-schedule', ts); ok++; }
      catch { fail++; }
    }
    return { ok, fail };
  },

  /** Broadcast a manager text message to every paired PC. Agents on
   *  v1.0.8+ show it as an on-screen toast; older agents ignore it. */
  messageAll: async (machines: Machine[], text: string) => {
    const body = text.trim().slice(0, 300);
    if (!body) return { ok: 0, fail: 0 };
    const ts = Date.now();
    let ok = 0, fail = 0;
    for (const m of machines) {
      try { await pushRtdb(m.id, 'message', ts, { text: body }); ok++; }
      catch { fail++; }
    }
    return { ok, fail };
  },

  /** Instant manual override — writes Firestore (for the badge) + RTDB (agent). */
  send: async (machine: Machine, cmd: 'shutoff' | 'allow') => {
    const ts = Date.now();
    await firestore().collection('firewallControl').doc(machine.id).set(
      {
        command: cmd,
        timestamp: ts,
        setBy: 'manager',
        machineName: machine.machineName || machine.id,
        ...(machine.kidId ? { kidId: machine.kidId } : {}),
        lastSeenAt: machine.lastSeenAt || ts,
      },
      { merge: true },
    );
    await pushRtdb(machine.id, cmd, ts);
  },
};
