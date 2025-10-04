// src/lib/pagination.ts
import { Query, DocumentSnapshot } from "firebase/firestore";

export async function fetchPage<T>(query: Query, pageSize: number, startAfterDoc?: DocumentSnapshot | null): Promise<{ docs: T[]; lastDoc: DocumentSnapshot | null; }> {
  let q: Query = query.limit(pageSize);
  if (startAfterDoc) {
    q = query.startAfter(startAfterDoc);
  }
  const snap = await q.get();
  const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];
  const lastDoc = snap.docs[snap.docs.length - 1] || null;
  return { docs, lastDoc };
}
