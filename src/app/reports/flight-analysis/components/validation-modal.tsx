
"use client";

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ExtractedPassenger } from '@/lib/types';
import { CheckCircle, AlertTriangle, XCircle, FileWarning } from 'lucide-react';
import { saveExtractedFlightData } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type ValidationStatus = '✔️ سليم' | '⚠️ تحذير' | '❌ خطأ';

interface ValidatedRow extends ExtractedPassenger {
  status: ValidationStatus;
  notes: string;
}

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  parsedData: ExtractedPassenger[];
  runId: string;
  defaultClientId: string;
  defaultSupplierId: string;
  onSaveSuccess: () => void;
}

async function runValidation(rows: ExtractedPassenger[]): Promise<ValidatedRow[]> {
  // This is a placeholder for the advanced validation logic
  // In a real scenario, this would involve API calls to check against the database
  
  return rows.map(row => {
    const issues: string[] = [];
    let status: ValidationStatus = '✔️ سليم';

    if (!row.pnrClass) {
        issues.push("PNR مفقود");
        status = '❌ خطأ';
    }
    if (!row.name) {
        issues.push("اسم مفقود");
        status = '❌ خطأ';
    }
    if (row.payable <= 0) {
        issues.push("السعر غير صالح");
        if(status !== '❌ خطأ') status = '⚠️ تحذير';
    }
    
    // Placeholder for db checks
    // if (Math.random() > 0.8) {
    //     issues.push("PNR موجود مسبقًا");
    //     status = '❌ خطأ';
    // }
    // if (Math.random() > 0.6 && status !== '❌ خطأ') {
    //     issues.push("تطابق مع رحلة ذهاب");
    //     status = '⚠️ تحذير';
    // }

    return {
      ...row,
      status,
      notes: issues.join(' / ') || '—',
    };
  });
}

export default function ValidationModal({ open, onClose, parsedData, runId, defaultClientId, defaultSupplierId, onSaveSuccess }: ValidationModalProps) {
  const [step, setStep] = useState(1);
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleStartValidation = async () => {
    const results = await runValidation(parsedData);
    setValidatedData(results);
    setStep(2);
  };
  
  const handleSave = async (acceptWarnings: boolean) => {
    setIsSaving(true);
    let rowsToSave = validatedData;
    
    if(!acceptWarnings) {
        rowsToSave = validatedData.filter(r => r.status === '✔️ سليم');
    }
    
    rowsToSave = rowsToSave.filter(r => r.status !== '❌ خطأ');

    const pnrGroups = rowsToSave.reduce((acc, row) => {
        const key = row.pnrClass || row.bookingReference;
        if (!acc[key]) {
            acc[key] = { pnr: key, passengers: [] };
        }
        acc[key].passengers.push(row);
        return acc;
    }, {} as Record<string, {pnr: string, passengers: ValidatedRow[]}>);

    // This is not quite right, the save function expects a different structure
    // but for now, we'll pass it this way and adapt.
    // This is where the logic would need to be robust.
    // const result = await saveExtractedFlightData({ pnrGroups: Object.values(pnrGroups), defaultClientId, defaultSupplierId });
    
    // if(result.success) {
    //     toast({title: `تم حفظ ${result.count} حجز بنجاح`});
    //     onSaveSuccess();
    //     onClose();
    // } else {
    //      toast({title: "خطأ في الحفظ", description: result.error, variant: 'destructive'});
    // }

    console.log("Saving...", rowsToSave);
    toast({title: "الحفظ قيد التطوير"});

    setIsSaving(false);
  }

  const summary = useMemo(() => {
    return validatedData.reduce((acc, row) => {
        if (row.status === '✔️ سليم') acc.valid++;
        else if (row.status === '⚠️ تحذير') acc.warning++;
        else acc.error++;
        return acc;
    }, { valid: 0, warning: 0, error: 0 });
  }, [validatedData]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>معالج استيراد بيانات الرحلات</DialogTitle>
           {step === 1 && (
            <DialogDescription>
              الخطوة 1 من 2: معاينة البيانات الأولية. اضغط على "الانتقال للتدقيق" للبدء.
            </DialogDescription>
          )}
          {step === 2 && (
             <DialogDescription>
                الخطوة 2 من 2: مراجعة نتائج التدقيق وحفظ البيانات السليمة.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
           {step === 1 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PNR</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الوجهة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.pnrClass}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.route}</TableCell>
                      <TableCell>{row.flightDate}</TableCell>
                      <TableCell>{row.flightTime}</TableCell>
                      <TableCell className="text-right font-mono">{row.payable.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           )}
           {step === 2 && (
               <>
                 <div className="flex justify-around p-4 bg-muted rounded-lg mb-4 text-center">
                    <div className="font-bold text-green-600"><CheckCircle className="inline me-2"/>سليم: {summary.valid}</div>
                    <div className="font-bold text-yellow-600"><AlertTriangle className="inline me-2"/>تحذير: {summary.warning}</div>
                    <div className="font-bold text-red-600"><XCircle className="inline me-2"/>خطأ: {summary.error}</div>
                 </div>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PNR</TableHead>
                            <TableHead>الاسم</TableHead>
                            <TableHead>السعر</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الملاحظات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {validatedData.map((row, i) => (
                           <TableRow key={i}>
                               <TableCell>{row.pnrClass}</TableCell>
                               <TableCell>{row.name}</TableCell>
                               <TableCell className="font-mono">{row.payable.toFixed(2)}</TableCell>
                               <TableCell>
                                 <Badge variant={row.status === '✔️ سليم' ? 'default' : (row.status === '⚠️ تحذير' ? 'secondary' : 'destructive')}>
                                     {row.status}
                                 </Badge>
                               </TableCell>
                               <TableCell className="text-xs text-muted-foreground">{row.notes}</TableCell>
                           </TableRow>
                       ))}
                    </TableBody>
                 </Table>
               </>
           )}
        </div>
        <DialogFooter className="border-t pt-4">
          {step === 1 && <Button onClick={handleStartValidation}>الانتقال إلى التدقيق</Button>}
          {step === 2 && (
              <div className="flex justify-between w-full">
                  <Button variant="outline" onClick={() => setStep(1)}>رجوع</Button>
                  <div className="flex gap-2">
                       <Button onClick={() => handleSave(false)} disabled={isSaving || summary.valid === 0}>
                           اعتماد السليم فقط ({summary.valid})
                       </Button>
                       <Button onClick={() => handleSave(true)} disabled={isSaving || (summary.valid + summary.warning === 0)} variant="secondary">
                           اعتماد مع التحذيرات ({summary.valid + summary.warning})
                       </Button>
                  </div>
              </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

