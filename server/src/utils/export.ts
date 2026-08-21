/**
 * Phase 2 – Export helpers.
 *
 * Generates CSV and XLSX (.xlsx) buffers from a list of records + column
 * definitions. Used by the analytics export endpoints so admins can download
 * ALL filtered records (not just the current page).
 */

import ExcelJS from "exceljs";

export interface ExportColumn {
  header: string;
  key: string;
  /** Optional numeric formatting (e.g. "0.00" or "#,##0.00") for Excel. */
  format?: string;
}

export interface XlsxSheetDefinition {
  name: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
}

/**
 * Build a CSV string from rows + columns. Handles escaping of commas,
 * quotes, and newlines.
 */
export function buildCsv(columns: ExportColumn[], rows: Record<string, any>[]): string {
  const escape = (v: any): string => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escape(row[c.key])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

/**
 * Build an XLSX buffer from rows + columns. Uses ExcelJS. The first row is a
 * styled header; money columns use the provided number format.
 */
export async function buildXlsx(
  columns: ExportColumn[],
  rows: Record<string, any>[]
): Promise<Buffer> {
  return buildMultiSheetXlsx([{ name: "Report", columns, rows }]);
}

/**
 * Build an XLSX buffer with multiple named sheets.
 */
export async function buildMultiSheetXlsx(sheets: XlsxSheetDefinition[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const s of sheets) {
    const sheet = workbook.addWorksheet(s.name);
    const headerRow = sheet.addRow(s.columns.map((c) => c.header));
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });

    for (const row of s.rows) {
      const values = s.columns.map((c) => {
        const v = row[c.key];
        if (c.format && typeof v === "number") {
          return v;
        }
        return v == null ? "" : v;
      });
      const excelRow = sheet.addRow(values);
      s.columns.forEach((c, idx) => {
        const cell = excelRow.getCell(idx + 1);
        if (c.format && typeof row[c.key] === "number") {
          cell.numFmt = c.format;
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    }

    s.columns.forEach((c, idx) => {
      const maxLen = Math.max(
        c.header.length,
        ...s.rows.map((r) => String(r[c.key] ?? "").length)
      );
      sheet.getColumn(idx + 1).width = Math.min(Math.max(maxLen + 2, 10), 40);
    });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
