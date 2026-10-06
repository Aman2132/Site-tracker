/**
 * One-time backfill: stamps `personName` onto every existing `photos` doc
 * that doesn't have one yet, using its `personId` to look up the name in
 * `people`. New uploads already get this from the client (see
 * usePhotoCaptureController) — this just catches everything uploaded before
 * that field existed.
 *
 * Usage:
 *   cd scripts
 *   npm install
 *   node backfillPhotoNames.js /path/to/serviceAccountKey.json
 */
const admin = require('firebase-admin');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node backfillPhotoNames.js /path/to/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

async function main() {
  const peopleSnap = await db.collection('people').get();
  const nameById = new Map(peopleSnap.docs.map(doc => [doc.id, doc.data().name]));
  console.log(`Loaded ${nameById.size} people.`);

  const photosSnap = await db.collection('photos').get();
  console.log(`Found ${photosSnap.size} photos.`);

  let batch = db.batch();
  let pending = 0;
  let updated = 0;
  let skippedHasName = 0;
  let skippedUnknownPerson = 0;

  for (const doc of photosSnap.docs) {
    const photo = doc.data();
    if (photo.personName) {
      skippedHasName += 1;
      continue;
    }
    const name = nameById.get(photo.personId);
    if (!name) {
      console.warn(`No matching person for photo ${doc.id} (personId=${photo.personId}) — skipped`);
      skippedUnknownPerson += 1;
      continue;
    }
    batch.update(doc.ref, { personName: name });
    updated += 1;
    pending += 1;
    // Firestore caps a batch at 500 writes.
    if (pending === 500) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  console.log(`\nDone. Updated ${updated}, already had a name ${skippedHasName}, unknown person ${skippedUnknownPerson}.`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
