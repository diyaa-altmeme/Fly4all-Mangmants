
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
            <aside className="w-1/3 border-r">
                <ChatList onSelectChat={setSelectedChatId} />
            </aside>
            <main className="flex-1 flex flex-col">
                {selectedChatId ? (
                    <ChatWindow chatId={selectedChatId} />
                ) : (
                    <div className="flex-grow flex items-center justify-center text-muted-foreground">
                        <p>اختر محادثة لبدء التراسل.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
