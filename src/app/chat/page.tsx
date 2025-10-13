
"use client";

import React from 'react';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import usePresence from '@/hooks/usePresence';

export default function ChatPage() {
    const [selectedChatId, setSelectedChatId] = React.useState<string | null>(null);
    
    // Initialize presence tracking for the current user
    usePresence();

    return (
        <div className="flex h-[calc(100vh-100px)] border rounded-lg bg-card text-card-foreground">
            <aside className="w-full md:w-[350px] border-r flex flex-col">
                <ChatList onSelectChat={setSelectedChatId} selectedChatId={selectedChatId} />
            </aside>
            <main className="flex-1 flex-col hidden md:flex">
                {selectedChatId ? (
                    <ChatWindow chatId={selectedChatId} />
                ) : (
                    <div className="flex-grow flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <MessageSquare className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600"/>
                            <p className="mt-4 font-bold">اختر محادثة لبدء التراسل.</p>
                            <p className="text-sm">أو ابدأ محادثة جديدة من القائمة.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
