
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Search, User as UserIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/lib/types';
import { getUsers } from '@/app/users/actions';
import { createOrGetDirectChat } from '@/app/chat/actions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface CreateChatModalProps {
  children: React.ReactNode;
  onChatCreated: (chatId: string) => void;
}

export default function CreateChatModal({ children, onChatCreated }: CreateChatModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (debouncedSearch) {
      setLoading(true);
      getUsers({ searchTerm: debouncedSearch }).then(fetchedUsers => {
        // Filter out the current user from the list
        const otherUsers = (fetchedUsers as User[]).filter(u => u.uid !== currentUser?.uid);
        setUsers(otherUsers);
        setLoading(false);
      });
    } else {
      setUsers([]);
    }
  }, [debouncedSearch, currentUser]);

  const handleSelectUser = async (otherUser: User) => {
    if (!currentUser || !('uid' in currentUser)) return;
    setIsCreating(true);
    try {
        const chatId = await createOrGetDirectChat(currentUser.uid, otherUser.uid);
        onChatCreated(chatId);
        setOpen(false);
    } catch (error) {
        console.error("Failed to create or get chat", error);
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>بدء محادثة جديدة</DialogTitle>
          <DialogDescription>
            ابحث عن موظف لبدء محادثة فردية معه.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {loading && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}
            {users.map(user => (
              <div
                key={user.uid}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => handleSelectUser(user)}
              >
                <div className="flex items-center gap-3">
                   <Avatar>
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                 {isCreating && <Loader2 className="animate-spin h-4 w-4"/>}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
