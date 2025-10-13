
"use client";

import React from 'react';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import usePresence from '@/hooks/usePresence';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
    const [selectedChatId, setSelectedChatId] = React.useState<string | null>(null);
    usePresence();
    const isMobile = useIsMobile();

    const handleBack = () => {
        setSelectedChatId(null);
    };

    // On mobile, show either list or chat window, not both.
    if (isMobile) {
        return (
            <div className="h-[calc(100vh-100px)] border rounded-lg bg-card text-card-foreground overflow-hidden">
                <div className={cn("h-full transition-transform duration-300", selectedChatId ? "-translate-x-full" : "translate-x-0")}>
                    <ChatList onSelectChat={setSelectedChatId} selectedChatId={selectedChatId} />
                </div>
                <div className={cn("absolute inset-0 transition-transform duration-300", selectedChatId ? "translate-x-0" : "translate-x-full")}>
                    {selectedChatId && (
                        <div className="flex flex-col h-full">
                             <div className="p-2 border-b flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={handleBack}>
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                                {/* You can add chat header info here */}
                            </div>
                            <ChatWindow chatId={selectedChatId} />
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // On desktop, show both panes.
    return (
        <div className="flex h-[calc(100vh-100px)] border rounded-lg bg-card text-card-foreground">
            <aside className="w-full md:w-[350px] border-l flex flex-col bg-muted/20">
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
