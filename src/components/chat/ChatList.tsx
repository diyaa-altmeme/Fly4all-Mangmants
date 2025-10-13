
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Search, PlusCircle, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from '../ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import CreateChatModal from './CreateChatModal';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface ChatListProps {
    onSelectChat: (chatId: string) => void;
    selectedChatId: string | null;
}

export default function ChatList({ onSelectChat, selectedChatId }: ChatListProps) {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, `userChats/${user.uid}/summaries`),
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
    
    const filteredChats = useMemo(() => {
        if (!debouncedSearch) return chats;
        return chats.filter(chat => {
            const name = chat.type === 'group' ? chat.title : chat.otherMemberName;
            return name?.toLowerCase().includes(debouncedSearch.toLowerCase());
        });
    }, [chats, debouncedSearch]);
    

    const getOtherMemberInfo = (chat: any) => {
        if (chat.type === 'group') {
            return {
                name: chat.title || 'مجموعة',
                avatarUrl: chat.avatarUrl,
                icon: <Users className="h-5 w-5" />
            };
        }
        return {
            name: chat.otherMemberName || 'مستخدم',
            avatarUrl: chat.otherMemberAvatar,
            icon: <User className="h-5 w-5" />
        };
    }

    return (
        <>
            <div className="p-3 border-b sticky top-0 bg-background z-10">
                 <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold">المحادثات</h2>
                    <CreateChatModal onChatCreated={(chatId) => onSelectChat(chatId)}>
                        <Button variant="ghost" size="icon">
                            <PlusCircle className="h-5 w-5" />
                        </Button>
                    </CreateChatModal>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="بحث..." 
                        className="ps-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="flex justify-center items-center h-full p-8"><Loader2 className="animate-spin" /></div>
                ) : filteredChats.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">لا توجد محادثات.</div>
                ) : (
                    <div className="p-2 space-y-1">
                        {filteredChats.map(chat => {
                            const { name, avatarUrl } = getOtherMemberInfo(chat);
                            const lastMessage = chat.lastMessage;
                            const isSelected = selectedChatId === chat.id;

                            return (
                                <button 
                                    key={chat.id} 
                                    className={cn(
                                        "w-full text-right p-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3",
                                        isSelected && "bg-muted"
                                    )}
                                    onClick={() => onSelectChat(chat.id)}
                                >
                                    <Avatar className="h-12 w-12 border">
                                        <AvatarImage src={avatarUrl} />
                                        <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold truncate">{name}</p>
                                            <p className="text-xs text-muted-foreground shrink-0">
                                                {lastMessage?.createdAt && formatDistanceToNow(lastMessage.createdAt.toDate(), { addSuffix: true, locale: ar })}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-sm text-muted-foreground truncate">
                                                {lastMessage?.text || 'مرفق'}
                                            </p>
                                             {chat.unreadCount > 0 && (
                                                <Badge className="w-5 h-5 flex items-center justify-center p-0">{chat.unreadCount}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
        </>
    );
}
