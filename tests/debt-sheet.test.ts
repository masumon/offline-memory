import { zipSync, strToU8 } from 'fflate';
import { columnIndex, excelSerialToIso, parseDelimited, readDelimitedSheet, readXlsx, sniffDelimiter } from '../src/services/debt/xlsx';
import { analyseSheet, mapColumns, sheetToRawRows, toRawRows } from '../src/services/debt/sheet-map';
import { buildImportPreview } from '../src/services/debt/port-core';

// ── a real (minimal) .xlsx, built in-memory so the reader is tested end to end ──

const SHARED = ['নাম', 'পরিমাণ', 'তারিখ', 'ধরন', 'কিস্তি ১', 'কিস্তি ২', 'রহিম', 'দেনা', 'করিম', 'পাওনা', 'মোট'];

function si(list: string[]): string {
  return `<?xml version="1.0"?><sst count="${list.length}" uniqueCount="${list.length}">${list
    .map((s) => `<si><t>${s}</t></si>`)
    .join('')}</sst>`;
}

/** `s` = shared-string index, `n` = number, `d` = number rendered with a date format. */
function cell(ref: string, kind: 's' | 'n' | 'd', value: string | number): string {
  if (kind === 's') return `<c r="${ref}" t="s"><v>${value}</v></c>`;
  if (kind === 'd') return `<c r="${ref}" s="1"><v>${value}</v></c>`;
  return `<c r="${ref}"><v>${value}</v></c>`;
}

function buildWorkbook(): Uint8Array {
  const sheet = `<?xml version="1.0"?><worksheet><sheetData>
    <row r="1">${cell('A1', 's', 0)}${cell('B1', 's', 1)}${cell('C1', 's', 2)}${cell('D1', 's', 3)}${cell('E1', 's', 4)}${cell('F1', 's', 5)}</row>
    <row r="2">${cell('A2', 's', 6)}${cell('B2', 'n', 50000)}${cell('C2', 'd', 45915)}${cell('D2', 's', 7)}${cell('E2', 'n', 25000)}${cell('F2', 'n', 25000)}</row>
    <row r="3">${cell('A3', 's', 8)}${cell('B3', 'n', 8000)}${cell('C3', 'd', 45915)}${cell('D3', 's', 9)}</row>
    <row r="4">${cell('A4', 's', 10)}${cell('B4', 'n', 58000)}</row>
  </sheetData></worksheet>`;

  const styles = `<?xml version="1.0"?><styleSheet><cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    <xf numFmtId="14" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>
  </cellXfs></styleSheet>`;

  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types/>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0"?><workbook><sheets><sheet name="দেনা" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/sharedStrings.xml': strToU8(si(SHARED)),
    'xl/styles.xml': strToU8(styles),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  });
}

describe('readXlsx', () => {
  const sheets = readXlsx(buildWorkbook());

  it('reads the sheet name, shared strings and plain numbers', () => {
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.name).toBe('দেনা');
    expect(sheets[0]!.rows[0]).toEqual(['নাম', 'পরিমাণ', 'তারিখ', 'ধরন', 'কিস্তি ১', 'কিস্তি ২']);
    expect(sheets[0]!.rows[1]![1]).toBe('50000');
  });

  it('turns date-formatted serials into ISO dates', () => {
    expect(sheets[0]!.rows[1]![2]).toBe('2025-09-15');
    expect(excelSerialToIso(45915)).toBe('2025-09-15');
    expect(excelSerialToIso(0)).toBeNull();
  });

  it('places rows by their `r` attribute, so omitted blank rows still count', () => {
    // Excel writes no <row> at all for a blank line, so document order alone would
    // slide the data up and misreport which spreadsheet row the header sits on.
    const gapped = zipSync({
      'xl/workbook.xml': strToU8('<?xml version="1.0"?><workbook><sheets><sheet name="G" sheetId="1"/></sheets></workbook>'),
      'xl/sharedStrings.xml': strToU8(si(['শিরোনাম', 'নাম'])),
      'xl/worksheets/sheet1.xml': strToU8(
        `<?xml version="1.0"?><worksheet><sheetData><row r="1">${cell('A1', 's', 0)}</row><row r="4">${cell('A4', 's', 1)}</row></sheetData></worksheet>`,
      ),
    });
    const rows = readXlsx(gapped)[0]!.rows;
    expect(rows).toHaveLength(4);
    expect(rows[0]![0]).toBe('শিরোনাম');
    expect(rows[1]![0]).toBe('');
    expect(rows[2]![0]).toBe('');
    expect(rows[3]![0]).toBe('নাম');
  });

  it('pads short rows so every row has the same width', () => {
    expect(sheets[0]!.rows[2]).toHaveLength(6);
    expect(sheets[0]!.rows[2]![4]).toBe('');
  });

  it('rejects a file that is not a workbook', () => {
    const notAWorkbook = zipSync({ 'hello.txt': strToU8('hi') });
    expect(() => readXlsx(notAWorkbook)).toThrow(/worksheet/i);
  });
});

describe('columnIndex', () => {
  it('decodes spreadsheet column letters', () => {
    expect(columnIndex('A1')).toBe(0);
    expect(columnIndex('Z9')).toBe(25);
    expect(columnIndex('AA1')).toBe(26);
    expect(columnIndex('12')).toBe(-1);
  });
});

describe('parseDelimited', () => {
  it('honours quoted commas, escaped quotes and embedded newlines', () => {
    const rows = parseDelimited('a,"b, still b","he said ""hi""","two\nlines"\n1,2,3,4\n');
    expect(rows[0]).toEqual(['a', 'b, still b', 'he said "hi"', 'two\nlines']);
    expect(rows[1]).toEqual(['1', '2', '3', '4']);
  });
  it('sniffs semicolon and tab separated files', () => {
    expect(sniffDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(sniffDelimiter('a\tb\tc')).toBe('\t');
    expect(readDelimitedSheet('a;b\n1;2').rows[1]).toEqual(['1', '2']);
  });
});

describe('analyseSheet', () => {
  it('finds a header row that is not the first row, and drops the total line', () => {
    const grid = {
      name: 'S', width: 3,
      rows: [
        ['আমার দেনার হিসাব', '', ''],
        ['', '', ''],
        ['নাম', 'পরিমাণ', 'তারিখ'],
        ['রহিম', '50000', '2025-09-15'],
        ['', '', ''],
        ['মোট', '50000', ''],
      ],
    };
    const a = analyseSheet(grid);
    expect(a.headerRowIndex).toBe(2);
    expect(a.dataRows).toEqual([['রহিম', '50000', '2025-09-15']]);
    expect(a.mapping).toEqual(['personName', 'amount', 'takenOrGivenDate']);
    expect(a.confidence).toBeGreaterThan(0);
  });

  it('falls back to a positional mapping when there is no header', () => {
    const a = analyseSheet({ name: 'S', width: 2, rows: [['রহিম', '5000'], ['করিম', '3000']] });
    expect(a.headerRowIndex).toBe(-1);
    expect(a.confidence).toBe(0);
    expect(a.mapping).toEqual(['personName', 'amount']);
    expect(a.dataRows).toHaveLength(2);
  });
});

describe('mapColumns', () => {
  it('gives a single-use field to its strongest column only', () => {
    // Both look like a person column; the exact match must win and the other is left free.
    const m = mapColumns(['পাওনাদারের নাম', 'নাম', 'পরিমাণ']);
    expect(m[1]).toBe('personName');
    expect(m[0]).not.toBe('personName');
    expect(m[2]).toBe('amount');
  });

  it('claims every instalment-looking column, including bare numbers and months', () => {
    expect(mapColumns(['Name', 'Amount', 'Jan', 'Feb', '3'])).toEqual(
      ['personName', 'amount', 'installment', 'installment', 'installment'],
    );
  });

  it('maps English headers too', () => {
    const m = mapColumns(['Person', 'Mobile', 'Type', 'Principal', 'Date', 'Due', 'Paid', 'Purpose', 'Remark']);
    expect(m).toEqual(['personName', 'phone', 'direction', 'amount', 'takenOrGivenDate', 'dueDate', 'paidAmount', 'purpose', 'notes']);
  });
});

describe('sheet -> raw rows -> preview', () => {
  it('carries a whole workbook through to reconciliation counts', () => {
    const [sheet] = readXlsx(buildWorkbook());
    const { analysis, raws } = sheetToRawRows(sheet!);

    expect(analysis.headerRowIndex).toBe(0);
    expect(analysis.mapping).toEqual(['personName', 'amount', 'takenOrGivenDate', 'direction', 'installment', 'installment']);
    // The "মোট" line is dropped, so only the two real rows survive.
    expect(raws).toHaveLength(2);
    expect(raws[0]!.personName).toBe('রহিম');
    expect(raws[0]!.installments).toEqual(['25000', '25000']);

    const { preview } = buildImportPreview(raws, new Set());
    expect(preview.totalRows).toBe(2);
    expect(preview.validRows).toBe(2);
    expect(preview.newDebts).toBe(1);
    expect(preview.newReceivables).toBe(1);
    expect(preview.installments).toBe(2);
    expect(preview.excelTotalPaisa).toBe(58_000 * 100);
    expect(preview.parsedTotalPaisa).toBe(58_000 * 100);
  });

  it('respects a user-edited mapping', () => {
    const rows = [['রহিম', '5000', 'ইট']];
    const raws = toRawRows(rows, ['personName', 'amount', 'purpose']);
    expect(raws[0]).toEqual({ personName: 'রহিম', amount: '5000', purpose: 'ইট', installments: [] });
  });
});
