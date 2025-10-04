

"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ImportDataPreview({
  data,
}: {
  data: Record<string, any[]>;
}) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div className="mt-6 space-y-8">
      {Object.entries(data).map(([section, rows]) => {
        if (!rows || !Array.isArray(rows) || rows.length === 0) return null;

        return (
          <div key={section}>
            <h3 className="font-bold text-lg border-b pb-1 mb-2 capitalize">{section}</h3>
            <div className="overflow-auto max-h-64 border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(rows[0] || {}).map((col) => (
                      <TableHead key={col} className="p-2 bg-gray-50">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="border px-2 py-1">
                          {String(val)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

