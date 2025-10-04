
"use client";

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { CustomRelationField } from "@/lib/types";

interface ImportPreviewTableProps {
  rows: any[];
  onRowUpdate: (index: number, row: any) => void;
  onDeleteRow: (index: number) => void;
  fieldMap: Record<string, string>;
  relationFields: CustomRelationField[];
}

export default function ImportPreviewTable({ rows, onRowUpdate, onDeleteRow, fieldMap, relationFields }: ImportPreviewTableProps) {
  if (rows.length === 0) {
    return <p className="text-center text-muted-foreground p-8">لا توجد بيانات لعرضها.</p>;
  }

  const mappedHeaders = React.useMemo(() => {
    return Object.values(fieldMap).filter(val => val !== '__ignore__');
  }, [fieldMap]);
  
  const getHeaderLabel = (fieldId: string) => {
      return relationFields.find(f => f.id === fieldId)?.label || fieldId;
  }

  return (
    <div className="overflow-auto max-h-[500px] border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/80">
          <TableRow>
            {mappedHeaders.map((key) => (
              <TableHead key={key}>{getHeaderLabel(key)}</TableHead>
            ))}
            <TableHead className="text-center">حذف</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {mappedHeaders.map((key) => (
                <TableCell key={key} className="p-1">
                  <Input
                    value={row[key] || ''}
                    onChange={(e) => onRowUpdate(idx, { ...row, [key]: e.target.value })}
                    className="h-8"
                  />
                </TableCell>
              ))}
              <TableCell className="text-center p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-8 w-8"
                  onClick={() => onDeleteRow(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
