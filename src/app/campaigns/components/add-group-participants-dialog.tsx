
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Search, Users } from "lucide-react";
import type { WhatsappContact } from "@/lib/types";
import { addWhatsappGroupParticipant } from "../actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";

interface AddGroupParticipantsDialogProps {
  accountId: string;
  groupId: string;
  groupName: string;
  allContacts: WhatsappContact[];
  children: React.ReactNode;
}

export default function AddGroupParticipantsDialog({
  accountId,
  groupId,
  groupName,
  allContacts,
  children,
}: AddGroupParticipantsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredContacts = React.useMemo(() => {
    if (!debouncedSearchTerm) return allContacts;
    return allContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        contact.id.includes(debouncedSearchTerm)
    );
  }, [allContacts, debouncedSearchTerm]);

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (selectedContacts.size === 0) {
      toast({ title: "لم يتم تحديد أي جهات اتصال", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const contactId of selectedContacts) {
      const result = await addWhatsappGroupParticipant(accountId, groupId, contactId);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        toast({
          title: `خطأ في إضافة ${contactId}`,
          description: result.error,
          variant: "destructive",
        });
      }
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsSaving(false);
    toast({
      title: "اكتملت العملية",
      description: `تمت إضافة ${successCount} أعضاء بنجاح، وفشلت إضافة ${errorCount} أعضاء.`,
    });
    setOpen(false);
  };
  
  useEffect(() => {
    if(!open) {
        setSelectedContacts(new Set());
        setSearchTerm('');
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>إضافة أعضاء إلى: {groupName}</DialogTitle>
          <DialogDescription>
            حدد جهات الاتصال التي ترغب في إضافتها إلى المجموعة.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
            />
        </div>
        <ScrollArea className="flex-grow border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => handleSelectContact(contact.id)}
              >
                <Checkbox
                  checked={selectedContacts.has(contact.id)}
                  onCheckedChange={() => handleSelectContact(contact.id)}
                />
                <div className="flex-grow">
                  <p className="font-semibold">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.id.split('@')[0]}</p>
                </div>
              </div>
            ))}
            {filteredContacts.length === 0 && <p className="text-center text-muted-foreground p-4">لا توجد نتائج.</p>}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSaving || selectedContacts.size === 0}>
            {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <UserPlus className="me-2 h-4 w-4" />}
            إضافة ({selectedContacts.size}) أعضاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
