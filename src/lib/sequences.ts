

'use server';

import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const VOUCHER_TYPES = [
    "voucher",
    "booking",
    "visa",
    "exchange",
    "payment",
    "standard_receipt",
    "distributed_receipt",
    "refund",
    "void",
    "salary",
    "subscription",
    "segment",
    "profit-sharing",
    "PARTNER",
    "COMP",
    "SEG",
    "SUB"
];

export async function getNextVoucherNumber(type: string = "voucher"): Promise<string> {
    if (!VOUCHER_TYPES.includes(type)) {
        throw new Error(`Invalid voucher type: ${type}`);
    }

    const db = await getDb();
    if (!db) {
        throw new Error("Database connection is not available.");
    }

    const sequenceDocRef = db.collection('sequences').doc(type);

    try {
        const increment = FieldValue.increment(1);
        const result = await sequenceDocRef.update({ seq: increment });
        if (!result) {
            await sequenceDocRef.set({ seq: 1 });
            return `${type.toUpperCase()}-1`;
        }
        const snapshot = await sequenceDocRef.get();
        const data = snapshot.data();

        return `${type.toUpperCase()}-${data?.seq}`;
    } catch (error: any) {
        console.error("Error getting next voucher number:", error.message);
        try {
            // Attempt to create the document if it doesn't exist
            await db.collection('sequences').doc(type).set({ seq: 1 });
            return `${type.toUpperCase()}-1`;
        } catch (setupError: any) {
            console.error("Error setting up sequence:", setupError.message);
            throw new Error(`Failed to generate next voucher number after setup: ${setupError.message}`);
        }
    }
}
