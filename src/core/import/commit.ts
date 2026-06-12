import type { FieldDef } from '@/core/types/module';
import type {
  ColumnMapping,
  ImportSummary,
  ParsedTable,
  ValidationReport,
} from '@/core/types/import';
import { importRecords } from '@/core/db/mutations';
import { buildRowData, coerceRowData } from './validate';

export interface SkipOptions {
  skipRequiredEmpty: boolean;
  skipDuplicates: boolean;
  skipAnomalies: boolean;
}

/** 検証結果とスキップ設定を適用してレコードを確定登録する */
export async function commitImport(params: {
  table: ParsedTable;
  mapping: ColumnMapping;
  moduleId: string;
  fields: FieldDef[];
  report: ValidationReport;
  skips: SkipOptions;
}): Promise<ImportSummary> {
  const { table, mapping, moduleId, fields, report, skips } = params;
  const rows = buildRowData(table, mapping);

  const skipIdx = new Set<number>();
  if (skips.skipRequiredEmpty) for (const i of report.rows.requiredEmpty) skipIdx.add(i);
  if (skips.skipDuplicates) {
    for (const i of report.rows.duplicateInFile) skipIdx.add(i);
    for (const i of report.rows.duplicateExisting) skipIdx.add(i);
  }
  if (skips.skipAnomalies) for (const i of report.rows.anomaly) skipIdx.add(i);

  const accepted = rows
    .filter((_, i) => !skipIdx.has(i))
    .map((row) => coerceRowData(row, fields))
    .filter((row) => Object.keys(row).length > 0);

  const summary: ImportSummary = {
    imported: accepted.length,
    skipped: rows.length - accepted.length,
    duplicates: report.rows.duplicateInFile.size + report.rows.duplicateExisting.size,
    anomalies: report.rows.anomaly.size,
    requiredEmpty: report.rows.requiredEmpty.size,
    emptyCells: report.emptyCellCount,
    moduleId,
    fileName: table.sourceName,
  };

  if (accepted.length > 0) {
    await importRecords(moduleId, accepted, {
      fileName: table.sourceName,
      fileType: table.fileType,
      skippedCount: summary.skipped,
      issues: {
        requiredEmpty: summary.requiredEmpty,
        duplicate: summary.duplicates,
        anomaly: summary.anomalies,
        emptyCells: summary.emptyCells,
      },
    });
  }
  return summary;
}
