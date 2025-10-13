
'use client';
import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function MessageItem({ chatId, msg }: { chatId: string, msg: any }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(msg.text || '');
    const me = auth.currentUser?.uid;
    const isMyMessage = msg.senderId === me;

    async function saveEdit() {
        if (!text) return;
        const ref = doc(db, `chats/${chatId}/messages/${msg.id}`);
        await updateDoc(ref, { text, editedAt: serverTimestamp() });
        setEditing(false);
    }

    async function remove() {
        const ref = doc(db, `chats/${chatId}/messages/${msg.id}`);
        await updateDoc(ref, { 
            deleted: true, 
            text: 'تم حذف هذه الرسالة', 
            attachments: [], 
            editedAt: serverTimestamp() 
        });
    }

    return (
        <div className={cn("flex items-end gap-2 my-2", isMyMessage ? "justify-end" : "justify-start")}>
            {!isMyMessage && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.senderAvatarUrl} />
                    <AvatarFallback>{msg.senderName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
            )}
            <div className={cn(
                "p-3 rounded-lg max-w-lg",
                isMyMessage ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                 {!isMyMessage && <p className="text-xs font-bold mb-1">{msg.senderName}</p>}
                <p className="whitespace-pre-wrap">{msg.deleted ? <i>تم حذف هذه الرسالة</i> : msg.text}</p>
                 <p className={cn("text-xs mt-1", isMyMessage ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {msg.createdAt?.toDate() ? format(msg.createdAt.toDate(), 'p', { locale: ar }) : ''}
                    {msg.editedAt && ' (تم التعديل)'}
                </p>
            </div>
        </div>
    );
}
