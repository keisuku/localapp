import type { ParsedTable } from '@/core/types/import';

/** インポート前プレビュー（先頭数行） */
export function PreviewTable({ table, limit = 5 }: { table: ParsedTable; limit?: number }) {
  return (
    <div className="max-h-56 overflow-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted sticky top-0">
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="border-b px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.slice(0, limit).map((row, ri) => (
            <tr key={ri} className="even:bg-muted/30">
              {table.headers.map((_, ci) => (
                <td key={ci} className="max-w-44 truncate border-b px-2 py-1 whitespace-nowrap">
                  {row[ci] == null ? '' : String(row[ci])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
