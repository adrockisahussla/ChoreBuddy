// One-off: inspect (and optionally backfill) a user doc by uid.
// usage: node scripts/inspect-user.js <uid>
const admin = require('firebase-admin');
const path = require('path');
admin.initializeApp({
  credential: admin.credential.cert(require(path.join(__dirname, 'service-account-key.json'))),
});
const db = admin.firestore();
(async () => {
  const uid = process.argv[2];
  if (!uid) { console.error('uid required'); process.exit(1); }
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  console.log('users/' + uid + ' exists:', snap.exists);
  if (snap.exists) console.log('data:', JSON.stringify(snap.data(), null, 2));
  // Also list ALL user docs in case there are orphans
  const all = await db.collection('users').get();
  console.log('\nAll user docs (' + all.size + '):');
  all.docs.forEach(d => console.log(' -', d.id, '→', JSON.stringify(d.data())));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
