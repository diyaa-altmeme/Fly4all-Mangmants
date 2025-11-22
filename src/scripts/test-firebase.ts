import { getDb } from '@/lib/firebase/firebase-admin-sdk';

(async function(){
  try {
    const db = await getDb();
    console.log('Got db instance. Trying to fetch one doc from chart_of_accounts (if exists)...');
    const snap = await db.collection('chart_of_accounts').limit(1).get();
    console.log('Collections fetch success. Docs:', snap.size);
    snap.forEach(d => console.log(' - ', d.id));
  } catch (e: any) {
    console.error('Firebase test failed:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  }
})();
