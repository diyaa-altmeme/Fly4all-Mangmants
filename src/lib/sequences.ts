

'use server';

import { getDb } from './firebase-admin';
import type { VoucherSequence } from './types';
import { cache } from 'react';

const SEQUENCES_COLLECTION = 'sequences';

const DEFAULT_SEQUENCES: Omit<VoucherSequence, 'value'>[] = [
    { id: "RC", label: "سند قبض", prefix: "RC" },
    { id: "PV", label: "سند دفع", prefix: "PV" },
    { id: "EX", label: "سند مصاريف", prefix: "EX" },
    { id: "TR", label: "سند حوالة", prefix: "TR" },
    { id: "DS", label: "سند قبض مخصص", prefix: "DS" },
    { id: "JE", label: "سند قيد محاسبي", prefix: "JE" },
    { id: "BK", label: "إدخال حجز", prefix: "BK" },
    { id: "PR", label: "ربح شهري", prefix: "PR" },
    { id: "VS", label: "إدخال فيزا", prefix: "VS" },
    { id: "SUB", label: "إنشاء اشتراك", prefix: "SUB" },
    { id: "SUBP", label: "دفعة قسط اشتراك", prefix: "SUBP" },
    { id: "RF", label: "استرجاع تذكرة", prefix: "RF" },
    { id: "EXC", label: "تغيير تذكرة", prefix: "EXC" },
    { id: "VOID", label: "إلغاء (فويد)", prefix: "VOID" },
    { id: "EXT", label: "معاملة بورصة", prefix: "EXT" },
    { id: "EXP", label: "تسديد بورصة", prefix: "EXP" },
];


export async function getSequences(): Promise<VoucherSequence[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available.");

    const snapshot = await db.collection(SEQUENCES_COLLECTION).get();
    
    if (snapshot.empty) {
        // Seed the collection if it's empty
        const batch = db.batch();
        const initialSequences: VoucherSequence[] = DEFAULT_SEQUENCES.map(s => ({ ...s, value: 0 }));
        initialSequences.forEach(seq => {
            batch.set(db.collection(SEQUENCES_COLLECTION).doc(seq.id), seq);
        });
        await batch.commit();
        return initialSequences;
    }
    
    const sequences = snapshot.docs.map(doc => doc.data() as VoucherSequence);

    // Check for any missing default sequences and add them
    const missing = DEFAULT_SEQUENCES.filter(ds => !sequences.some(s => s.id === ds.id));
    if (missing.length > 0) {
        const batch = db.batch();
        missing.forEach(m => {
             batch.set(db.collection(SEQUENCES_COLLECTION).doc(m.id), {...m, value: 0});
        });
        await batch.commit();
        return getSequences(); // Re-fetch to get the complete list
    }
    
    return sequences;
};


export async function updateSequence(id: string, data: Partial<VoucherSequence>): Promise<{ success: boolean; error?: string }> {
    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };
    try {
        await db.collection(SEQUENCES_COLLECTION).doc(id).update(data);
        return { success: true };
    } catch(e: any) {
        return { success: false, error: e.message };
    }
}


export async function getNextVoucherNumber(prefixId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available.");
  
  const seqRef = db.collection(SEQUENCES_COLLECTION).doc(prefixId);

  try {
    const sequenceData = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(seqRef);
      
      let currentNumber = 1;
      let prefix = prefixId;
      let label = `سند ${prefixId}`; // fallback label

      if (snapshot.exists) {
        const data = snapshot.data() as VoucherSequence;
        currentNumber = (data.value || 0) + 1;
        prefix = data.prefix || prefixId;
        label = data.label || label;
      }

      transaction.set(seqRef, { value: currentNumber, prefix, label }, { merge: true });
      return { number: currentNumber, prefix: prefix };
    });

    const paddedNumber = String(sequenceData.number).padStart(6, "0");
    return `${sequenceData.prefix}-${paddedNumber}`;
    
  } catch (error) {
    console.error(`Error getting next voucher number for prefix ${prefixId}:`, error);
    // Fallback in case of transaction error
    return `${prefixId}-${Date.now().toString().slice(-6)}`;
  }
}
