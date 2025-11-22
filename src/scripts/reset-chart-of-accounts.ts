import { getDb } from '../src/lib/firebase/firebase-admin-sdk';
import { SEED_ACCOUNTS } from '../src/lib/finance/chart-of-accounts-data';

async function reset() {
  const db = await getDb();
  console.log('Deleting all documents in chart_of_accounts');
  const snap = await db.collection('chart_of_accounts').get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log('Deleted. Now seeding again');
  // reuse seed logic
  for (const a of SEED_ACCOUNTS) {
    const now = new Date();
    await db.collection('chart_of_accounts').add({
      code: a.code,
      name: a.name,
      type: a.type,
      parentId: a.parentId || null,
      parentCode: a.parentCode || null,
      isLeaf: !!a.isLeaf,
      description: a.description || null,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log('Reset complete');
}

reset().catch(err => { console.error(err); process.exit(1); });

