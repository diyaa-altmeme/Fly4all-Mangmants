
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { HardDrive, History, Wand2 } from "lucide-react";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FilesArchive from '@/components/reconciliation/files-archive';
import ReconciliationTool from '@/components/reconciliation/reconciliation-tool';


export default function ReconciliationPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">التدقيق الذكي</h1>
        <Button asChild variant="outline">
          <Link href="/reconciliation/history">
            <History className="mr-2 h-4 w-4" />
            عرض سجل التدقيق
          </Link>
        </Button>
      </div>

       <Tabs defaultValue="tool" className="w-full">
            <TabsList className="border-b-2 border-transparent p-0 bg-transparent h-auto justify-start">
                <TabsTrigger 
                    value="tool" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=active]:shadow-none bg-transparent hover:bg-muted/50 data-[state=active]:bg-transparent px-4 py-2 font-semibold text-base"
                >
                    <Wand2 className="me-2 h-5 w-5"/>
                    أداة التدقيق
                </TabsTrigger>
                <TabsTrigger 
                    value="archive" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none data-[state=active]:shadow-none bg-transparent hover:bg-muted/50 data-[state=active]:bg-transparent px-4 py-2 font-semibold text-base"
                >
                    <HardDrive className="me-2 h-5 w-5"/>
                    أرشيف الملفات
                </TabsTrigger>
            </TabsList>
            <TabsContent value="tool" className="mt-6">
                <ReconciliationTool />
            </TabsContent>
            <TabsContent value="archive" className="mt-6">
                <FilesArchive />
            </TabsContent>
        </Tabs>
      
    </div>
  );
}
