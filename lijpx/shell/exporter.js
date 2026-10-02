// CSV and Excel downloads of the table a page declares with exports(data, ctx).

import { h } from './dom.js?v=e03acf3e7a';
import { xlsxBlob } from './xlsx.js?v=73999d04b7';

// A spreadsheet treats text starting with one of these as a formula, so such text gets a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/;

export function exportFilename(toolTitle, pageTitle, asOf) {
  return `${toolTitle} - ${pageTitle} - ${asOf}`.replace(/[\\/:*?"<>|]+/g, '-');
}

// RFC 4180: comma separated, CRLF line ends, fields with commas, quotes or line breaks quoted.
function csvText(table) {
  const lines = [
    table.columns.map((column) => csvField(cellText(column.label, column))),
    ...table.rows.map((row) => table.columns.map((column) => csvField(cellText(row[column.key], column)))),
  ];
  return lines.map((fields) => `${fields.join(',')}\r\n`).join('');
}

export function downloadCsv(table, filename) {
  // The byte order mark tells Excel the file is UTF-8.
  save(new Blob(['\ufeff', csvText(table)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}

export function downloadXlsx(table, filename, sheetName) {
  save(xlsxBlob(table, sheetName), `${filename}.xlsx`);
}

function cellText(value, column) {
  if (value == null) return '';
  if (typeof value === 'number') return column.decimals == null ? String(value) : value.toFixed(column.decimals);
  const text = String(value);
  return FORMULA_START.test(text) ? `'${text}` : text;
}

function csvField(text) {
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = h('a', { href: url, download: filename, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
