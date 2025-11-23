
'use server';
import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import { chartOfAccountsData } from '@/lib/finance/chart-of-accounts-data';

async function reset() {
  const db = await getDb();
  console.log('Deleting all documents in chart_of_accounts');
  const snap = await db.collection('chart_of_accounts').get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log('Deleted. Now seeding again');
  
  for (const a of chartOfAccountsData) {
    const now = new Date();
    await db.collection('chart_of_accounts').add({
      code: a.code,
      name: a.name,
      type: a.type,
      parentId: null, // Will be linked later
      parentCode: a.parentCode || null,
      isLeaf: !!a.isLeaf,
      description: a.description || null,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  // Link parents
  const allAccountsSnap = await db.collection('chart_of_accounts').get();
  const accountsByCode = new Map<string, string>();
  allAccountsSnap.forEach(doc => {
      accountsByCode.set(doc.data().code, doc.id);
  });

  const updateBatch = db.batch();
  allAccountsSnap.forEach(doc => {
      const data = doc.data();
      if (data.parentCode) {
          const parentId = accountsByCode.get(data.parentCode);
          if (parentId) {
              updateBatch.update(doc.ref, { parentId });
          }
      }
  });
  await updateBatch.commit();


  console.log('Reset complete');
}

reset().catch(err => { console.error(err); process.exit(1); });
