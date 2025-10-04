
'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search, SlidersHorizontal, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runAdvancedFlightAudit, type DataAuditIssue } from './actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// This entire page is deprecated. The audit logic is now integrated into the main flight reports table.
// This can be removed in a future cleanup.
export default function DeprecatedFlightAuditTool() {
    return (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">تم دمج هذه الأداة في صفحة أرشيف تقارير الرحلات.</p>
        </div>
    )
}
