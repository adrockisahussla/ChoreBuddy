import { useEffect, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { useCurrentUser } from './useCurrentUser';
import { useFamilyId } from './useFamilyId';
import { useBuddies } from './useBuddies';
import { screenTimeBurnService, ScreenTimeBurn } from '../services/screenTimeBurnService';
import { firewallControlService } from '../services/firewallControlService';
import { userService } from '../services/userService';
import { buddyLabel } from '../utils/buddy';

/**
 * Manager-side Phase 1 burner. Runs only when the signed-in user is a
 * manager. Watches `screenTimeBurns` for the family and:
 *
 *   1. As soon as a burn's `expiresAt <= now`, push SHUTOFF to every
 *      machine on the burn and decrement the kid's `minutesRemaining`
 *      by the granted minutes (so the wallet drops to 0). Mark
 *      `processedAt` so only one device acts.
 *   2. While a burn is still active (`expiresAt > now`), tick a local
 *      timer every 30s so reconciliation happens even between Firestore
 *      snapshots.
 *
 * Phase 2 will move this into the Windows agent (live decrement + auto
 * shutoff when the wallet hits zero). The data model is the same — only
 * the loop owner changes.
 */
export function useScreenTimeBurner(): void {
  const { userDoc } = useCurrentUser();
  const familyId = useFamilyId();
  const { buddies } = useBuddies();
  const [burns, setBurns] = useState<ScreenTimeBurn[]>([]);
  const [tick, setTick] = useState(0);

  const isManager = userDoc?.role === 'manager';

  useEffect(() => {
    if (!isManager || !familyId) return;
    const unsub = screenTimeBurnService.subscribeFamily(familyId, setBurns);
    return () => unsub();
  }, [isManager, familyId]);

  // Local 30s heartbeat so we re-evaluate even if Firestore is quiet.
  useEffect(() => {
    if (!isManager || !familyId) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [isManager, familyId]);

  useEffect(() => {
    if (!isManager) return;
    const now = Date.now();
    const expired = burns.filter(b => !b.processedAt && b.expiresAt <= now);
    if (expired.length === 0) return;

    (async () => {
      for (const b of expired) {
        try {
          // Mark FIRST so a co-manager device opening the app at the
          // same time doesn't double-push. Firestore's last-write-wins
          // is acceptable: we'd rather risk a silent skipped SHUTOFF
          // than two SHUTOFFs colliding with each other.
          await screenTimeBurnService.markProcessed(b.id);
          for (const machineId of b.machineIds) {
            await firewallControlService.send(
              { id: machineId, kidId: b.kidId } as any,
              'shutoff',
            );
          }
          // Zero out the wallet — Phase 2 will do this incrementally;
          // here we just decrement by the granted minutes. If multiple
          // grants are stacked, this still keeps math consistent
          // because each burn only decrements its own minutes.
          await userService.addMinutes(b.kidId, -b.minutes);
          if (Platform.OS === 'android') {
            ToastAndroid.show(
              `⏱ ${buddyLabel(b.kidId, buddies)}'s ${b.minutes} min ran out — PC blocked`,
              ToastAndroid.SHORT,
            );
          }
        } catch (e: any) {
          // Leave processedAt set anyway — retrying on a known-failing
          // machineId would just spam errors. Manager can manually
          // shutoff from GameWall if needed.
          if (Platform.OS === 'android') {
            ToastAndroid.show(`Auto-block failed: ${e?.message || e}`, ToastAndroid.LONG);
          }
        }
      }
    })();
  }, [burns, tick, isManager, buddies]);
}
