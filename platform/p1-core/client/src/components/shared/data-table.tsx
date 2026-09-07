import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchField?: keyof T;
  searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchField,
  searchPlaceholder = "Search...",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filteredData = searchField
    ? data.filter((row) => {
        const value = row[searchField];
        if (typeof value === "string") {
          return value.toLowerCase().includes(search.toLowerCase());
        }
        return true;
      })
    : data;

  return (
    <div className="flex flex-col gap-4">
      {searchField && (
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          data-testid="input-table-search"
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, rowIndex) => (
                <TableRow key={rowIndex} data-testid={`row-data-${rowIndex}`}>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                          ? String(row[col.accessorKey] ?? "")
                          : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
