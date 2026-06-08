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
async function pushRtdb(machineId: string, cmd: 'shutoff' | 'allow', ts: number) {
  const u = auth().currentUser;
  if (!u) throw new Error('Not signed in');
  const token = await u.getIdToken();
  const url = `${RTDB_URL}/firewallControl/${encodeURIComponent(machineId)}/control.json?auth=${token}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: cmd, timestamp: ts }),
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
