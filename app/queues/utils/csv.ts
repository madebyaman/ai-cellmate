/*
  Minimal CSV utilities with observability.
  Note: This is a lightweight parser that supports standard quoting rules.
  It is not intended to handle all edge cases of RFC 4180 but covers common cases.
*/

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsvLoose(csvText: string): ParsedCsv {
  console.log('[csv] parseCsvLoose:start', { length: csvText.length });
  const allLines = normalizeNewlines(csvText).split('\n');
  if (allLines.length === 0) {
    console.log('[csv] parseCsvLoose:empty');
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(allLines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < allLines.length; i++) {
    const line = allLines[i];
    if (line.trim() === '' && i === allLines.length - 1) continue; // trailing newline
    const fields = parseCsvLine(line);
    // Pad or trim to headers length for consistency
    const normalized = normalizeRowToHeaders(fields, headers.length);
    rows.push(normalized);
  }
  console.log('[csv] parseCsvLoose:done', { headerCount: headers.length, rowCount: rows.length });
  return { headers, rows };
}

export function reconstructCsv(headers: string[], rows: string[][]): string {
  console.log('[csv] reconstructCsv:start', { headerCount: headers.length, rowCount: rows.length });
  const headerLine = serializeCsvLine(headers);
  const rowLines = rows.map((r) => serializeCsvLine(normalizeRowToHeaders(r, headers.length)));
  const out = [headerLine, ...rowLines].join('\n');
  console.log('[csv] reconstructCsv:done', { length: out.length });
  return out;
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeRowToHeaders(row: string[], headerCount: number): string[] {
  if (row.length === headerCount) return row;
  if (row.length < headerCount) return [...row, ...Array(headerCount - row.length).fill('')];
  return row.slice(0, headerCount);
}

export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        const peek = line[i + 1];
        if (peek === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === ',') {
        result.push(current);
        current = '';
      } else if (char === '"') {
        inQuotes = true;
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function serializeCsvLine(fields: string[]): string {
  return fields
    .map((field) => {
      if (field == null) return '';
      const needsQuotes = /[",\n\r]/.test(field);
      let out = String(field);
      if (out.includes('"')) out = out.replace(/"/g, '""');
      return needsQuotes ? `"${out}"` : out;
    })
    .join(',');
}


