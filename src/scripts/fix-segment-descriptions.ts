
import { getDb } from '@/lib/firebase-admin';

async function fixSegmentDescriptions() {
  const db = await getDb();
  if (!db) {
      console.error("Database not available.");
      return;
  }
  
  console.log('🔍 Starting script to fix segment descriptions...');

  const vouchersRef = db.collection('journal-vouchers');
  const snapshot = await vouchersRef.where('sourceType', '==', 'segment').get();

  if (snapshot.empty) {
    console.log('✅ No segment vouchers found to update. Exiting.');
    return;
  }

  const batch = db.batch();
  let updatedCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    let hasChanged = false;

    const updateEntries = (entries: any[]) => {
      return entries.map(entry => {
        if (entry.description && entry.description.startsWith('إيراد سكمنت من')) {
          const parts = entry.description.split(' للفترة من ');
          if (parts.length > 1) {
            entry.description = `سكمنت للفترة من ${parts[1]}`;
            hasChanged = true;
          }
        }
        return entry;
      });
    };
    
    const newDebitEntries = updateEntries(data.debitEntries || []);
    const newCreditEntries = updateEntries(data.creditEntries || []);

    if (hasChanged) {
      batch.update(doc.ref, { 
        debitEntries: newDebitEntries, 
        creditEntries: newCreditEntries 
      });
      updatedCount++;
      console.log(`📝 Scheduled update for voucher ID: ${doc.id}`);
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`✅ Successfully updated ${updatedCount} segment voucher descriptions.`);
  } else {
    console.log('✅ No descriptions needed updating.');
  }
}

fixSegmentDescriptions()
  .then(() => {
    console.log('Script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed with an error:', error);
    process.exit(1);
  });
