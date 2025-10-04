
"use client";

import * as React from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import { type Subscription, type AppSettings, SubscriptionInstallment } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface InvoiceTemplateProps {
    subscription: Subscription;
    settings: AppSettings;
    installments: SubscriptionInstallment[];
}

export default function InvoiceTemplate({ subscription, settings, installments = [] }: InvoiceTemplateProps) {
    const purchaseDate = parseISO(subscription.purchaseDate);
    const startDate = parseISO(subscription.startDate);
    const endDate = addMonths(startDate, subscription.numberOfInstallments);
    const unitPrice = subscription.unitPrice || 0;
    const quantity = subscription.quantity || 1;
    const discount = subscription.discount || 0;
    const subtotal = unitPrice * quantity;
    const salePrice = subscription.salePrice;
    const paidAmount = subscription.paidAmount || 0;
    const amountDue = salePrice - paidAmount;

    const companyInfo = settings.theme?.invoice || {};

    return (
        <div className="bg-white p-4 sm:p-8 font-sans" dir="rtl">
            <div className="w-full max-w-4xl mx-auto">
                
                 <header className="flex justify-between items-start pb-6 border-b-2">
                    <div className="text-left">
                        <h2 className="text-4xl font-bold uppercase" style={{ color: companyInfo.titleColor || '#333' }}>فاتورة</h2>
                        <p className="text-sm mt-1"><strong>رقم الفاتورة:</strong> <span className="font-mono">{subscription.invoiceNumber}</span></p>
                        <p className="text-sm"><strong>تاريخ الفاتورة:</strong> <span className="font-mono">{format(purchaseDate, 'yyyy-MM-dd')}</span></p>
                    </div>
                    <div className="text-right">
                        {settings.theme?.assets?.invoice_logo ? (
                             <Image src={settings.theme.assets.invoice_logo} alt={companyInfo.companyName || 'Company Logo'} width={160} height={80} style={{objectFit:"contain"}} />
                        ) : (
                             <h1 className="text-3xl font-bold text-gray-800">{companyInfo.companyName || 'Mudarib'}</h1>
                        )}
                        <p className="text-sm text-gray-500 mt-2">{companyInfo.companyAddress}</p>
                    </div>
                </header>

                <section className="mt-8 mb-8 flex justify-between gap-4">
                     <div className="text-right">
                        <p className="text-gray-500">فاتورة إلى:</p>
                        <p className="text-lg font-bold text-gray-800">{subscription.clientName}</p>
                        {subscription.client?.phone && <p className="text-sm text-gray-500">{subscription.client.phone}</p>}
                    </div>
                </section>

                <section>
                    <table className="w-full border-collapse text-sm" style={{borderCollapse: 'collapse', direction: 'rtl'}}>
                        <thead>
                            <tr style={{ backgroundColor: companyInfo.headerColor || '#f3f4f6' }}>
                                <th className="p-3 font-bold text-gray-600 border text-right" style={{fontWeight: 'bold' }}>الوصف</th>
                                <th className="p-3 font-bold text-gray-600 border w-24 text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>الكمية</th>
                                <th className="p-3 font-bold text-gray-600 border w-32 text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>سعر الوحدة</th>
                                <th className="p-3 font-bold text-gray-600 border w-32 text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>الخصم</th>
                                <th className="p-3 font-bold text-gray-600 border w-32 text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>المجموع</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-3 border align-top text-right">
                                    <p className="font-bold">{subscription.serviceName}</p>
                                    <p className="text-xs text-gray-500 font-normal">
                                        فترة الاشتراك من {format(startDate, 'yyyy-MM-dd')} إلى {format(endDate, 'yyyy-MM-dd')}.
                                    </p>
                                    {subscription.notes && <p className="text-xs text-gray-400 mt-1 font-normal">{subscription.notes}</p>}
                                </td>
                                <td className="p-3 border align-top font-mono" style={{ textAlign: 'center' }}>{quantity}</td>
                                <td className="p-3 border align-top font-mono" style={{ textAlign: 'center' }}>{unitPrice.toFixed(2)}</td>
                                <td className="p-3 border align-top font-mono" style={{ textAlign: 'center' }}>{discount.toFixed(2)}</td>
                                <td className="p-3 border align-top font-mono" style={{ textAlign: 'center' }}>{subtotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>
                
                {installments && installments.length > 0 && (
                     <section className="mt-8">
                        <h3 className="font-bold text-lg text-right mb-2" style={{fontWeight: 'bold' }}>جدول الأقساط</h3>
                        <table className="w-full border-collapse text-sm" style={{borderCollapse: 'collapse', direction: 'rtl'}}>
                            <thead>
                                <tr style={{ backgroundColor: companyInfo.headerColor || '#f3f4f6' }}>
                                    <th className="p-2 font-bold text-gray-600 border text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>تاريخ الاستحقاق</th>
                                    <th className="p-2 font-bold text-gray-600 border text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>المبلغ</th>
                                    <th className="p-2 font-bold text-gray-600 border text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>المسدد</th>
                                    <th className="p-2 font-bold text-gray-600 border text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>الخصم</th>
                                    <th className="p-2 font-bold text-gray-600 border text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>المتبقي</th>
                                    <th className="p-2 font-bold text-gray-600 border text-center" style={{ textAlign: 'center', fontWeight: 'bold' }}>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {installments.map(inst => {
                                    const remaining = (inst.amount || 0) - ((inst.paidAmount || 0) + (inst.discount || 0));
                                    return (
                                        <tr key={inst.id}>
                                            <td className="p-2 border text-center" style={{ textAlign: 'center' }}>{format(parseISO(inst.dueDate), 'yyyy-MM-dd')}</td>
                                            <td className="p-2 border font-mono text-center" style={{ textAlign: 'center' }}>{(inst.amount || 0).toFixed(2)} {inst.currency}</td>
                                            <td className="p-2 border font-mono text-green-600 text-center" style={{ textAlign: 'center' }}>{(inst.paidAmount || 0).toFixed(2)} {inst.currency}</td>
                                            <td className="p-2 border font-mono text-orange-600 text-center" style={{ textAlign: 'center' }}>{(inst.discount || 0).toFixed(2)} {inst.currency}</td>
                                            <td className="p-2 border font-mono text-red-600 text-center" style={{ textAlign: 'center' }}>{remaining.toFixed(2)} {inst.currency}</td>
                                            <td className={cn("p-2 border font-bold text-center", inst.status === 'Paid' ? 'text-green-600' : 'text-red-600')} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                {inst.status === 'Paid' ? 'مدفوع' : 'غير مدفوع'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </section>
                )}
                
                 <section className="mt-8 flex w-full justify-end">
                     <div className="w-full max-w-sm space-y-2 text-right">
                        <div className="flex justify-between items-center"><span className="font-bold text-gray-600">المجموع الفرعي:</span><span className="font-mono font-bold">{subtotal.toFixed(2)} {subscription.currency}</span></div>
                        <div className="flex justify-between items-center"><span className="font-bold text-gray-600">الخصم:</span><span className="font-mono font-bold text-red-500">- {discount.toFixed(2)} {subscription.currency}</span></div>
                        <div className="flex justify-between items-center border-t pt-2 font-bold text-base"><span>المجموع الإجمالي:</span><span className="font-mono">{salePrice.toFixed(2)} {subscription.currency}</span></div>
                        <div className="flex justify-between items-center"><span className="font-bold text-gray-600">المدفوع:</span><span className="font-mono font-bold text-green-600">{paidAmount.toFixed(2)} {subscription.currency}</span></div>
                        <div className="flex justify-between items-center rounded-lg bg-primary/10 p-2 font-bold text-lg"><span>المبلغ المستحق:</span><span className="font-mono">{amountDue.toFixed(2)} {subscription.currency}</span></div>
                    </div>
                </section>

                <footer className="mt-12 border-t pt-6 text-xs text-gray-500">
                     {companyInfo.footerText && <p className="mb-4 text-right">{companyInfo.footerText}</p>}
                     <p className="text-right">إذا كان لديك أي استفسار بخصوص هذه الفاتورة، الرجاء التواصل معنا.</p>
                     <div className="mt-2 flex justify-between items-end">
                        <div className="text-left">
                           <p>الهاتف: {companyInfo.companyPhone}</p>
                           <p>الموقع: {companyInfo.companyWeb}</p>
                        </div>
                        <div className="text-right">
                           <p className="font-semibold">{companyInfo.companyName || 'Mudarib'}</p>
                           <p>{companyInfo.companyAddress}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    )
}
