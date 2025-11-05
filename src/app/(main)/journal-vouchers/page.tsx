"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase"; // تأكد أن هذا هو مسار ملف التهيئة لديك
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/page-structure";

export default function JournalVouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "journal-vouchers"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setVouchers(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <PageContainer>
        <PageHeader
            title="📘 سندات اليومية (Journal Vouchers)"
            description="عرض مباشر لجميع القيود المحاسبية المسجلة في النظام."
            actions={
                <Link href="/" className="text-sm text-blue-600 hover:underline">
                    → رجوع إلى الرئيسية
                </Link>
            }
        />
        <PageSection>
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                </div>
            ) : vouchers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">لا توجد بيانات بعد.</p>
            ) : (
                <div className="overflow-auto border rounded-lg">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold">
                    <tr>
                        <th className="p-3 border-b">ID</th>
                        <th className="p-3 border-b">Type</th>
                        <th className="p-3 border-b">Date</th>
                        <th className="p-3 border-b">Amount</th>
                        <th className="p-3 border-b">Company</th>
                    </tr>
                    </thead>
                    <tbody>
                    {vouchers.map((v) => (
                        <tr key={v.id} className="odd:bg-background even:bg-muted/30 hover:bg-muted/50">
                        <td className="p-2 border-b font-mono text-xs">{v.id}</td>
                        <td className="p-2 border-b">{v.voucherType ?? "-"}</td>
                        <td className="p-2 border-b">{v.date ?? "-"}</td>
                        <td className="p-2 border-b font-mono">{(v.debitEntries?.[0]?.amount || v.creditEntries?.[0]?.amount || 0).toFixed(2)}</td>
                        <td className="p-2 border-b">{v.companyId ?? v.originalData?.clientId ?? "-"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
        </PageSection>
    </PageContainer>
  );
}
