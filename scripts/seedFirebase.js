/**
 * One-time setup script: creates a Firebase Auth account + Firestore
 * `people/{uid}` doc for the owner and each seed worker (mirrors
 * src/constants/mockData.ts), plus the `sites/default` doc.
 *
 * Usage:
 *   cd scripts
 *   npm install
 *   node seedFirebase.js /path/to/serviceAccountKey.json
 *
 * Get the service account key from Firebase Console -> Project settings ->
 * Service accounts -> Generate new private key. Keep it out of git — it's
 * a permanent admin credential for your whole project, not a build secret.
 */
const admin = require('firebase-admin');

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Usage: node seedFirebase.js /path/to/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const auth = admin.auth();
const db = admin.firestore();

const SITE = { name: 'Kathmandu Demo Site', lat: 27.7172, lng: 85.324, radius: 150 };

// A `password` here pins a fixed credential instead of generating a random
// one, and re-running the script resets it. Only the shared admin login uses
// this — it's a known-password account committed to the repo, so treat it as
// a development convenience and change it before real employees use the app.
const PEOPLE = [
  {
    email: 'admin@admin.com',
    password: '*A123456',
    name: 'Administrator',
    role: 'Administrator',
    appRole: 'owner',
    color: '#1c4ff0',
  },
  { email: 'owner@sitetracker.local', name: 'Site Owner', role: 'Owner', appRole: 'owner', color: '#1c4ff0' },
  { email: 'ramesh.kumar@sitetracker.local', name: 'Ramesh Kumar', role: 'Driver · Crew A', appRole: 'worker', color: '#1a73e8' },
  { email: 'suryakant.yadav@sitetracker.local', name: 'Suryakant Yadav', role: 'Mason · Crew A', appRole: 'worker', color: '#188038' },
  { email: 'pooja.devi@sitetracker.local', name: 'Pooja Devi', role: 'Helper · Crew A', appRole: 'worker', color: '#a142f4' },
  { email: 'arjun.thakur@sitetracker.local', name: 'Arjun Thakur', role: 'Bar bender · Crew B', appRole: 'worker', color: '#9aa0a6' },
  { email: 'vikas.singh@sitetracker.local', name: 'Vikas Singh', role: 'Carpenter · Crew B', appRole: 'worker', color: '#f29900' },
];

function randomPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6).toUpperCase() + '!1';
}

async function main() {
  await db.collection('sites').doc('default').set(SITE);
  console.log('Seeded sites/default');

  const credentials = [];
  for (const person of PEOPLE) {
    const password = person.password ?? randomPassword();
    let userRecord;
    try {
      userRecord = await auth.createUser({ email: person.email, password, displayName: person.name });
      console.log(`Created ${person.appRole}: ${person.name} <${person.email}>`);
    } catch (error) {
      if (error.code !== 'auth/email-already-exists') throw error;

      userRecord = await auth.getUserByEmail(person.email);
      if (person.password) {
        // Fixed-password accounts (the admin login) are reset on every run so
        // the credential in this file is always the one that actually works.
        await auth.updateUser(userRecord.uid, { password: person.password, displayName: person.name });
        console.log(`Reset ${person.appRole}: ${person.name} <${person.email}> (password re-applied)`);
      } else {
        // Generated-password accounts keep whatever they were given on first
        // run — we can't show it again, so don't claim to.
        console.log(`Skipped ${person.appRole}: ${person.name} <${person.email}> (already exists)`);
        await db.collection('people').doc(userRecord.uid).set({
          name: person.name,
          role: person.role,
          appRole: person.appRole,
          color: person.color,
        });
        continue;
      }
    }
    await db.collection('people').doc(userRecord.uid).set({
      name: person.name,
      role: person.role,
      appRole: person.appRole,
      color: person.color,
    });
    credentials.push({ name: person.name, email: person.email, password });
  }

  if (credentials.length > 0) {
    console.log('\n=== Save these credentials somewhere safe — shown only once ===');
    console.table(credentials);
  } else {
    console.log('\nNo new accounts created — everyone already existed.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
