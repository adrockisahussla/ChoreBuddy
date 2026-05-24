import { Platform, ToastAndroid } from 'react-native';

/**
 * Android's ToastAndroid.show calls fired in rapid succession overwrite
 * each other — only the last toast actually displays. This module-level
 * queue paces them out so every message is visible.
 *
 * Use case: assignee logs in and 5 chores were approved while offline.
 * We want 5 separate toasts, one after another, not 1.
 */
const queue: string[] = [];
const seen = new Set<string>();
let running = false;
const TOAST_SPACING_MS = 2500; // SHORT toast = ~2s, leave a small gap

export function enqueueToast(message: string, dedupeKey?: string): void {
  if (Platform.OS !== 'android') return;
  if (dedupeKey) {
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
  }
  queue.push(message);
  drain();
}

function drain(): void {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  try {
    ToastAndroid.show(next, ToastAndroid.SHORT);
  } catch {}
  setTimeout(() => {
    running = false;
    drain();
  }, TOAST_SPACING_MS);
}
