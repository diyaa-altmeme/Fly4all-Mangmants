
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProfitabilityData = {
  id: string;
  clientName: string;
  revenue: number;
  expense: number;
  profit: number;
};

export const columns: ColumnDef<ProfitabilityData>[] = [
  {
    accessorKey: "clientName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        <Users className="ml-2 h-4 w-4" />
        اسم العميل
        <ArrowUpDown className="mr-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        <TrendingUp className="ml-2 h-4 w-4" />
        الإيرادات
        <ArrowUpDown className="mr-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("revenue"));
      return <div className="text-right font-medium text-green-600">{amount.toLocaleString()} $</div>;
    },
  },
  {
    accessorKey: "expense",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        <TrendingDown className="ml-2 h-4 w-4" />
        المصروفات
        <ArrowUpDown className="mr-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("expense"));
      return <div className="text-right font-medium text-red-600">{amount.toLocaleString()} $</div>;
    },
  },
  {
    accessorKey: "profit",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        <DollarSign className="ml-2 h-4 w-4" />
        صافي الربح
        <ArrowUpDown className="mr-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("profit"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      return <div className={`text-right font-bold ${amount >= 0 ? 'text-blue-600' : 'text-red-700'}`}>{formatted}</div>;
    },
  },
];
