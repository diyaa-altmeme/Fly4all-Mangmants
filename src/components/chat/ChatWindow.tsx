
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, startAfter, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import MessageItem from './MessageItem';
import FileUploader from './FileUploader';
import { useAuth } from '@/lib/auth-context';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Paperclip } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';

const ChatHeader = ({ chatId }: { chatId: string }) => {
    const [chatInfo, setChatInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user || !chatId) return;
        const summaryRef = doc(db, `userChats/${user.uid}/summaries/${chatId}`);
        const unsubscribe = onSnapshot(summaryRef, (docSnap) => {
            if (docSnap.exists()) {
                setChatInfo(docSnap.data());
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [chatId, user]);

    if (loading) {
        return <div className="p-3 border-b flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-6 w-32" /></div>;
    }

    return (
        <div className="p-3 border-b flex items-center gap-3 bg-card sticky top-0 z-10">
            <Avatar>
                <AvatarImage src={chatInfo?.otherMemberAvatar} />
                <AvatarFallback>{chatInfo?.otherMemberName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-bold">{chatInfo?.otherMemberName}</p>
                <p className="text-xs text-muted-foreground">متصل</p>
            </div>
        </div>
    );
};


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
        senderAvatarUrl: user.avatarUrl || null, 
        createdAt: serverTimestamp() 
    };
    if (content.trim()) data.text = content.trim();
    if (attachments) data.attachments = attachments;
    await addDoc(mRef, data);

    const chatRef = doc(db, `chats/${chatId}`);
    const batch = writeBatch(db);

    const lastMessagePayload = { text: content.trim() || 'ملف مرفق', senderId: user.uid, createdAt: serverTimestamp() };
    
    batch.update(chatRef, { 
        lastMessage: lastMessagePayload,
        updatedAt: serverTimestamp()
    });

    const chatDoc = await getDoc(chatRef);
    if(chatDoc.exists()) {
        const chatData = chatDoc.data();
        const members = Object.keys(chatData.members);
        
        members.forEach(memberId => {
            const summaryRef = doc(db, `userChats/${memberId}/summaries/${chatId}`);
            const updatePayload: any = {
                lastMessage: lastMessagePayload,
                updatedAt: serverTimestamp()
            };
            if(memberId !== user.uid) {
                updatePayload.unreadCount = increment(1);
            }
            batch.update(summaryRef, updatePayload);
        });
    }

    await batch.commit();

    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <ChatHeader chatId={chatId} />
      <div className="flex-1 overflow-y-auto">
        <ScrollArea className="h-full p-4">
            {messages.map(m => <MessageItem key={m.id} chatId={chatId} msg={m} />)}
            <div ref={messagesEndRef} />
        </ScrollArea>
      </div>
      <div className="p-4 border-t flex items-center gap-2 bg-card">
         <FileUploader chatId={chatId} onUpload={(attachments) => handleSend(undefined, attachments)}>
            <Button variant="ghost" size="icon"><Paperclip /></Button>
         </FileUploader>
         <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب رسالتك..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="bg-muted border-muted-foreground/20 focus-visible:ring-primary"
         />
         <Button onClick={() => handleSend()} disabled={!inputText.trim()}>
            <Send />
        </Button>
      </div>
    </div>
  );
}
