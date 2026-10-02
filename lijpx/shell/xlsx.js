// A minimal .xlsx writer: one worksheet, inline strings, a bold header row, number formats, a frozen
// header, packed in an uncompressed ZIP. Text is never written as a formula, so a cell that starts
// with "=" stays text in Excel.

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = {
  main: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  rel: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  pkg: 'http://schemas.openxmlformats.org/package/2006/relationships',
  types: 'http://schemas.openxmlformats.org/package/2006/content-types',
};
const STYLE_HEADER = 1;
const FIRST_CUSTOM_FORMAT = 164;
const DOS_DATE_1980_01_01 = 0x21;

// table: { columns: [{ key, label, decimals? }], rows: [{ [key]: value }] }
export function xlsxBlob(table, sheetName) {
  const formats = [...new Set(table.columns.map((c) => c.decimals).filter((d) => d != null))];
  const files = {
    '[Content_Types].xml': contentTypes(),
    '_rels/.rels': `${XML}<Relationships xmlns="${NS.pkg}"><Relationship Id="rId1" Type="${NS.rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="${NS.main}" xmlns:r="${NS.rel}"><sheets><sheet name="${escapeXml(safeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="${NS.pkg}"><Relationship Id="rId1" Type="${NS.rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS.rel}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': styles(formats),
    'xl/worksheets/sheet1.xml': worksheet(table, formats),
  };
  const encoder = new TextEncoder();
  return zip(Object.entries(files).map(([name, text]) => ({ name, data: encoder.encode(text) })));
}

function contentTypes() {
  const part = (name, type) => `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.${type}+xml"/>`;
  return `${XML}<Types xmlns="${NS.types}">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + part('xl/workbook.xml', 'sheet.main') + part('xl/worksheets/sheet1.xml', 'worksheet') + part('xl/styles.xml', 'styles')
    + '</Types>';
}

// Cell styles: 0 plain, 1 header, then one per number format in `formats` (decimal places).
function styles(formats) {
  const numFmts = formats.map((d, i) => `<numFmt numFmtId="${FIRST_CUSTOM_FORMAT + i}" formatCode="${d === 0 ? '0' : `0.${'0'.repeat(d)}`}"/>`);
  const numberXfs = formats.map((_, i) => `<xf numFmtId="${FIRST_CUSTOM_FORMAT + i}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`);
  return `${XML}<styleSheet xmlns="${NS.main}">`
    + (numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.join('')}</numFmts>` : '')
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FF0A2240"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${2 + numberXfs.length}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
    + `${numberXfs.join('')}</cellXfs>`
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';
}

function worksheet(table, formats) {
  const { columns, rows } = table;
  const header = columns.map((column, c) => textCell(cellRef(c, 0), column.label, STYLE_HEADER));
  const body = rows.map((row, r) => columns.map((column, c) => {
    const value = row[column.key];
    if (value == null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
      const style = column.decimals == null ? 0 : 2 + formats.indexOf(column.decimals);
      return `<c r="${cellRef(c, r + 1)}"${style ? ` s="${style}"` : ''}><v>${value}</v></c>`;
    }
    return textCell(cellRef(c, r + 1), value, 0);
  }));
  const sheetRows = [header, ...body].map((cells, r) => `<row r="${r + 1}">${cells.join('')}</row>`).join('');
  const widths = columns.map((column) => rows.reduce(
    (widest, row) => Math.max(widest, String(row[column.key] ?? '').length),
    String(column.label).length,
  ));
  const cols = widths.map((width, c) => `<col min="${c + 1}" max="${c + 1}" width="${Math.min(Math.max(width, 6), 48) + 2}" customWidth="1"/>`).join('');
  return `${XML}<worksheet xmlns="${NS.main}">`
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${cols}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function textCell(ref, text, style) {
  return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function cellRef(columnIndex, rowIndex) {
  let name = '';
  for (let n = columnIndex + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return `${name}${rowIndex + 1}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Excel sheet names: at most 31 characters, none of : \ / ? * [ ]
function safeSheetName(name) {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Sheet1';
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP with every entry stored (method 0): local headers and data, then the central directory.
function zip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const directory = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, DOS_DATE_1980_01_01, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(local, nameBytes, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(14, DOS_DATE_1980_01_01, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    directory.push(entry, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const directorySize = directory.reduce((total, part) => total + part.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, directorySize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: MIME });
}
