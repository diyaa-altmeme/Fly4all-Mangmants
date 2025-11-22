

"use server";

import { getDb } from '@/lib/firebase/firebase-admin-sdk';
import type { JournalVoucher } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

const VOUCHERS_COLLECTION = "journal-vouchers";
const LEDGER_COLLECTION = "journal-ledger";
const DELETED_VOUCHERS_COLLECTION = "deleted-vouchers";

type FirestoreInstance = FirebaseFirestore.Firestore;

type SoftDeleteParams = {
  voucherId: string;
  deletedBy: string;
  deletedById?: string;
  reason?: string;
  deletedAt?: string;
  db?: FirestoreInstance;
};

type RestoreParams = {
  voucherId: string;
  restoredBy: string;
  restoredAt?: string;
  db?: FirestoreInstance;
};

type PermanentDeleteParams = {
  voucherId: string;
  db?: FirestoreInstance;
};

async function ensureDb(db?: FirestoreInstance): Promise<FirestoreInstance> {
  if (db) return db;
  const database = await getDb();
  if (!database) {
    throw new Error("Database not available.");
  }
  return database;
}

export async function softDeleteVoucherRecord({
  voucherId,
  deletedBy,
  deletedById,
  reason,
  deletedAt,
  db,
}: SoftDeleteParams): Promise<void> {
  const database = await ensureDb(db);
  const timestamp = deletedAt ?? new Date().toISOString();

  await database.runTransaction(async (transaction) => {
    const voucherRef = database.collection(VOUCHERS_COLLECTION).doc(voucherId);
    const voucherSnap = await transaction.get(voucherRef);

    if (!voucherSnap.exists) {
      return;
    }

    const voucherData = voucherSnap.data() as JournalVoucher;

    transaction.update(voucherRef, {
      isDeleted: true,
      deletedAt: timestamp,
      deletedBy,
      deletedById: deletedById ?? null,
      status: "deleted",
    });

    const deletedVoucherRef = database
      .collection(DELETED_VOUCHERS_COLLECTION)
      .doc(voucherId);

    transaction.set(
      deletedVoucherRef,
      {
        ...voucherData,
        id: voucherId,
        voucherId,
        deletedAt: timestamp,
        deletedBy,
        deletedById: deletedById ?? null,
        deleteReason: reason ?? null,
        isDeleted: true,
      },
      { merge: true },
    );

    const ledgerSnapshot = await transaction.get(
      database
        .collection(LEDGER_COLLECTION)
        .where("voucherId", "==", voucherId),
    );

    ledgerSnapshot.forEach((doc) => {
      transaction.update(doc.ref, {
        isDeleted: true,
        deletedAt: timestamp,
        deletedBy,
        deletedById: deletedById ?? null,
      });
    });
  });
}

export async function restoreVoucherRecord({
  voucherId,
  restoredBy,
  restoredAt,
  db,
}: RestoreParams): Promise<void> {
  const database = await ensureDb(db);
  const timestamp = restoredAt ?? new Date().toISOString();

  await database.runTransaction(async (transaction) => {
    const voucherRef = database.collection(VOUCHERS_COLLECTION).doc(voucherId);
    const deletedVoucherRef = database
      .collection(DELETED_VOUCHERS_COLLECTION)
      .doc(voucherId);

    const voucherSnap = await transaction.get(voucherRef);
    const deletedVoucherSnap = await transaction.get(deletedVoucherRef);

    if (!voucherSnap.exists && !deletedVoucherSnap.exists) {
      throw new Error("Voucher not found in deleted log.");
    }

    if (voucherSnap.exists) {
      transaction.update(voucherRef, {
        isDeleted: false,
        deletedAt: FieldValue.delete(),
        deletedBy: FieldValue.delete(),
        deletedById: FieldValue.delete(),
        restoredAt: timestamp,
        restoredBy,
        status: FieldValue.delete(),
      });
    } else if (deletedVoucherSnap.exists) {
      const voucherData = deletedVoucherSnap.data() as JournalVoucher & {
        deletedAt?: string;
        deletedBy?: string;
        deletedById?: string | null;
      };
      const dataToRestore: Record<string, unknown> = { ...voucherData };
      delete dataToRestore.deletedAt;
      delete dataToRestore.deletedBy;
      delete dataToRestore.deletedById;
      delete (dataToRestore as any).deleteReason;
      delete dataToRestore.isDeleted;

      transaction.set(
        voucherRef,
        {
          ...dataToRestore,
          id: voucherId,
          voucherId,
          isDeleted: false,
          restoredAt: timestamp,
          restoredBy,
        },
        { merge: true },
      );
    }

    transaction.delete(deletedVoucherRef);

    const ledgerSnapshot = await transaction.get(
      database
        .collection(LEDGER_COLLECTION)
        .where("voucherId", "==", voucherId),
    );

    ledgerSnapshot.forEach((doc) => {
      transaction.update(doc.ref, {
        isDeleted: false,
        deletedAt: FieldValue.delete(),
        deletedBy: FieldValue.delete(),
        deletedById: FieldValue.delete(),
        restoredAt: timestamp,
        restoredBy,
      });
    });
  });
}

export async function permanentlyDeleteVoucherRecord({
  voucherId,
  db,
}: PermanentDeleteParams): Promise<void> {
  const database = await ensureDb(db);

  await database.runTransaction(async (transaction) => {
    const voucherRef = database.collection(VOUCHERS_COLLECTION).doc(voucherId);
    const deletedVoucherRef = database
      .collection(DELETED_VOUCHERS_COLLECTION)
      .doc(voucherId);

    const ledgerSnapshot = await transaction.get(
      database
        .collection(LEDGER_COLLECTION)
        .where("voucherId", "==", voucherId),
    );

    ledgerSnapshot.forEach((doc) => {
      transaction.delete(doc.ref);
    });

    transaction.delete(voucherRef);
    transaction.delete(deletedVoucherRef);
  });
}
