// The FS/Sharing side of debt export — split from `port-core.ts` (pure engine + CSV
// builders) so tests and the web bundle can use the engine without pulling native FS.

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import type { SQLiteDatabase } from 'expo-sqlite';
import { buildDebtCsv, type DebtExportKind } from './port-core';
import { base64ToBytes, readDelimitedSheet, readXlsx, type SheetGrid } from './xlsx';

export * from './port-core';

/** File extensions and mime types we can turn into a sheet grid. */
export const IMPORT_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
  'text/tab-separated-values',
  'text/plain',
];

/**
 * Read a picked spreadsheet off disk. `.xlsx` comes back as base64 bytes and goes
 * through the unzip reader; everything else is treated as delimited text.
 */
export async function readSheetFile(uri: string, fileName: string): Promise<SheetGrid[]> {
  const isXlsx = /\.xlsx$/i.test(fileName) || /\.xlsm$/i.test(fileName);
  if (isXlsx) {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return readXlsx(base64ToBytes(b64));
  }
  if (/\.xls$/i.test(fileName)) {
    throw new Error('পুরনো .xls সমর্থিত নয় — Excel থেকে .xlsx বা .csv করে দিন / Legacy .xls is not supported — save as .xlsx or .csv');
  }
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return [readDelimitedSheet(text)];
}

export async function shareDebtExport(db: SQLiteDatabase, kind: DebtExportKind): Promise<'shared' | 'unavailable'> {
  const content = await buildDebtCsv(db, kind);
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const uri = `${dir}debt-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, content);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export debt data', UTI: 'public.comma-separated-values-text' });
  return 'shared';
}

/** The workbook shipped inside the app, for the "use the sheet in the app" button. */
export const BUNDLED_SHEET_NAME = 'স্মার্ট_ঋণ_কিস্তি_ফাইল.xlsx';

/**
 * Read the bundled starter workbook. It goes through exactly the same reader, mapping
 * and preview as a file the user picks, so the rows it creates are ordinary editable
 * records — nothing about this data is baked into the code.
 *
 * `assets/debt-import-sheet.xlsx` is git-ignored on purpose: this repository is public
 * and a real ledger names real people. To build a fresh clone, copy the committed
 * `assets/debt-import-sheet.example.xlsx` over it (or drop in your own sheet).
 */
export async function loadBundledSheet(): Promise<SheetGrid[]> {
  // Metro resolves bundled assets through require() only — an import would be inlined.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const asset = Asset.fromModule(require('../../../assets/debt-import-sheet.xlsx') as number);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('অ্যাপের ফাইলটি পাওয়া গেল না / Bundled sheet is unavailable');
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return readXlsx(base64ToBytes(b64));
}
