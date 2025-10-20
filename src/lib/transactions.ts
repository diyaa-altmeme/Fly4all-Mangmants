import {
  collection, addDoc, serverTimestamp, Timestamp, query, where, onSnapshot, DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

export type TxCategory = "segment" | "subscription" | "profit" | "share" | "other";
export type TxKind = "credit" | "debit";
export type TxStatus = "pending" | "completed" | "cancelled";
export type Currency = "IQD" | "USD" | "EUR";

export type Transaction = {
  id?: string;
  date: Date;
  company: string;
  accountName?: string;
  kind: TxKind;
  category: TxCategory;
  currency?: Currency;
  amount: number;
  status?: TxStatus;
  notes?: string;
  createdAt?: Timestamp;
  createdBy?: string;
};

export const TX_COL = "transactions";

export async function addTransaction(tx: Omit<Transaction, "id" | "createdAt">) {
  return addDoc(collection(db, TX_COL), {
    ...tx,
    createdAt: serverTimestamp(),
  });
}

export function watchTransactions(from: Date, to: Date, cb: (rows: Transaction[]) => void) {
  const q = query(
    collection(db, TX_COL),
    where("date", ">=", from),
    where("date", "<=", to)
  );
  const unsub = onSnapshot(q, (snap) => {
    const out: Transaction[] = [];
    snap.forEach((d) => {
      const data = d.data() as DocumentData;
      out.push({
        id: d.id,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        company: data.company,
        accountName: data.accountName,
        kind: data.kind,
        category: data.category,
        currency: data.currency || 'IQD',
        amount: Number(data.amount || 0),
        status: data.status || 'completed',
        notes: data.notes || "",
        createdAt: data.createdAt,
        createdBy: data.createdBy,
      });
    });
    out.sort((a, b) => a.date.getTime() - b.date.getTime());
    cb(out);
  });
  return unsub;
}
