
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, startAfter, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import MessageItem from './MessageItem';
import FileUploader from './FileUploader';
import { useAuth } from '@/lib/auth-context';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Paperclip } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export default function ChatWindow({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, snap => {
      const arr: any[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setMessages(arr.reverse());
      setLastDoc(snap.docs[snap.docs.length - 1]);
    });
    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string, attachments?: any[]) => {
    const content = text || inputText;
    if (!user || (!content.trim() && !attachments)) return;

    const mRef = collection(db, `chats/${chatId}/messages`);
    const data: any = { 
        senderId: user.uid, 
        senderName: user.name, 
        createdAt: serverTimestamp() 
    };
    if (content.trim()) data.text = content.trim();
    if (attachments) data.attachments = attachments;
    await addDoc(mRef, data);

    const chatRef = doc(db, `chats/${chatId}`);
    await updateDoc(chatRef, { 
        lastMessage: { text: content.trim() || 'ملف مرفق', senderId: user.uid, createdAt: serverTimestamp() },
        updatedAt: serverTimestamp()
    });

    setInputText('');
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow p-4">
        {messages.map(m => <MessageItem key={m.id} chatId={chatId} msg={m} />)}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="p-4 border-t flex items-center gap-2">
         <FileUploader chatId={chatId} onUpload={(attachments) => handleSend(undefined, attachments)}>
            <Button variant="ghost" size="icon"><Paperclip /></Button>
         </FileUploader>
         <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب رسالتك..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
         />
         <Button onClick={() => handleSend()} disabled={!inputText.trim()}>
            <Send />
        </Button>
      </div>
    </div>
  );
}
