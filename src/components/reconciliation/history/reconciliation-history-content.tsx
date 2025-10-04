

"use client";

import type { ReconciliationLog } from '@/lib/types';
import { DataTable } from './data-table';
import { columns } from './columns';

interface ReconciliationHistoryContentProps {
  logs: ReconciliationLog[];
}

export default function ReconciliationHistoryContent({ logs }: ReconciliationHistoryContentProps) {
  return (
    <DataTable columns={columns} data={logs} />
  );
}



