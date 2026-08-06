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
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  // Header row
  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Style header cells
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });

  // Data rows
  for (const row of rows) {
    const values = columns.map((c) => {
      const v = row[c.key];
      if (c.format && typeof v === "number") {
        return v;
      }
      return v == null ? "" : v;
    });
    const excelRow = sheet.addRow(values);
    columns.forEach((c, idx) => {
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

  // Auto width
  columns.forEach((c, idx) => {
    const maxLen = Math.max(
      c.header.length,
      ...rows.map((r) => String(r[c.key] ?? "").length)
    );
    sheet.getColumn(idx + 1).width = Math.min(Math.max(maxLen + 2, 10), 40);
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
