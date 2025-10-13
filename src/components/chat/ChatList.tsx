
'use client';
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ChatListProps {
    onSelectChat: (chatId: string) => void;
}

export default function ChatList({ onSelectChat }: ChatListProps) {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'chats'),
            where(`members.${user.uid}`, '==', true),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const chatsData: any[] = [];
            querySnapshot.forEach((doc) => {
                chatsData.push({ id: doc.id, ...doc.data() });
            });
            setChats(chatsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>;
    }
    
    const getOtherMemberName = (chat: any) => {
        if (chat.type === 'group') return chat.title || 'مجموعة';
        if (!user || !chat.memberDetails) return 'مستخدم';

        const otherMemberId = Object.keys(chat.members).find(id => id !== user.uid);
        return chat.memberDetails?.[otherMemberId!]?.displayName || 'مستخدم';
    }
    
    const getOtherMemberAvatar = (chat: any) => {
        if (chat.type === 'group') return chat.avatarUrl; // Assuming groups can have avatars
        if (!user || !chat.memberDetails) return '';
        const otherMemberId = Object.keys(chat.members).find(id => id !== user.uid);
        return chat.memberDetails?.[otherMemberId!]?.avatarUrl || '';
    }

    return (
        <div className="p-2 space-y-1">
            {chats.map(chat => (
                <button 
                    key={chat.id} 
                    className="w-full text-right p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-3"
                    onClick={() => onSelectChat(chat.id)}
                >
                    <Avatar>
                        <AvatarImage src={getOtherMemberAvatar(chat)} />
                        <AvatarFallback>{getOtherMemberName(chat)?.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <div className="flex-grow">
                        <div className="flex justify-between items-center">
                            <p className="font-bold">{getOtherMemberName(chat)}</p>
                            <p className="text-xs text-muted-foreground">
                                {chat.updatedAt && formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: true, locale: ar })}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                            {chat.lastMessage?.text || '...'}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
}
