// One-time migration: copy each user doc from auto-generated ID to {uid} as ID.
// Required for the new Firestore rules that look up users by `users/{auth.uid}`.
//
// Run once, then delete this file.
//
// Setup:
//   1. Firebase Console → Project Settings → Service accounts → Generate new private key
//   2. Save the JSON to scripts/service-account-key.json (gitignored)
//   3. cd /c/ChoreBuddy && node scripts/migrate-users-to-uid-id.js
//
// Idempotent: re-running after success does nothing because old auto-id docs
// will have been deleted.

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, 'service-account-key.json');
if (!fs.existsSync(KEY_PATH)) {
  console.error('Missing scripts/service-account-key.json. See header comment.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(KEY_PATH)),
});

const db = admin.firestore();

(async () => {
  const snap = await db.collection('users').get();
  console.log(`Found ${snap.size} user docs.`);

  let migrated = 0;
  let skipped = 0;
  let deletedDupes = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const uid = data.uid;

    if (!uid) {
      console.warn(`  skip ${doc.id} — no uid field`);
      skipped++;
      continue;
    }

    if (doc.id === uid) {
      console.log(`  ok ${uid} — already uses uid as doc ID`);
      skipped++;
      continue;
    }

    // Check if a uid-keyed doc already exists for this user. If so, this
    // auto-id doc is a leftover from a prior partial migration — delete it.
    const targetRef = db.collection('users').doc(uid);
    const existing = await targetRef.get();
    if (existing.exists) {
      console.log(`  dupe ${doc.id} → ${uid} (target exists, deleting old auto-id)`);
      await doc.ref.delete();
      deletedDupes++;
      continue;
    }

    console.log(`  migrate ${doc.id} → ${uid} (${data.email || 'no email'})`);
    await targetRef.set(data);
    await doc.ref.delete();
    migrated++;
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} deletedDupes=${deletedDupes}`);
  process.exit(0);
})().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
