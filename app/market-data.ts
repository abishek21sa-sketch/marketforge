export const MAX_MARKET_PRINTS = 1000;
export const MAX_MARKET_CSV_BYTES = 1_000_000;

export type MarketPrint = [
  time: string,
  side: 'buy' | 'sell',
  price: string,
  size: string,
  venue: string,
];

const requiredColumns = ['time', 'side', 'price', 'size', 'venue'] as const;

function isClockTime(value: string): boolean {
  if (!/^\d{2}:\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return hours <= 23 && minutes <= 59 && seconds <= 59;
}

export function isMarketPrint(value: unknown): value is MarketPrint {
  if (!Array.isArray(value) || value.length !== 5) return false;
  const [time, side, price, size, venue] = value;
  return (
    typeof time === 'string' &&
    isClockTime(time) &&
    typeof side === 'string' &&
    (side === 'buy' || side === 'sell') &&
    typeof price === 'string' &&
    /^\d+(?:\.\d{1,6})?$/.test(price) &&
    Number.isFinite(Number(price)) &&
    Number(price) > 0 &&
    typeof size === 'string' &&
    /^\d+$/.test(size) &&
    Number.isSafeInteger(Number(size)) &&
    Number(size) > 0 &&
    typeof venue === 'string' &&
    /^[A-Z0-9._-]{1,12}$/.test(venue)
  );
}

export function isMarketPrintList(value: unknown): value is MarketPrint[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MARKET_PRINTS &&
    value.every(isMarketPrint)
  );
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += character;
      }
    } else if (character === ',') {
      row.push(field);
      field = '';
      closedQuote = false;
    } else if (character === '\n' || character === '\r') {
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
      closedQuote = false;
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
    } else if (closedQuote && character.trim() === '') {
      continue;
    } else if (character === '"' && field.length === 0 && !closedQuote) {
      quoted = true;
    } else if (character === '"') {
      throw new Error('CSV has a quote in an unquoted field');
    } else if (closedQuote) {
      throw new Error('CSV has unexpected text after a quoted field');
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('CSV has an unclosed quoted field');
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

export function parseMarketPrintCsv(csv: string): MarketPrint[] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2)
    throw new Error('CSV needs a header and at least one print');

  const headers = rows[0].map((value) => value.trim().toLowerCase());
  const indexes = requiredColumns.map((column) => {
    const matches = headers.flatMap((header, index) =>
      header === column ? [index] : [],
    );
    if (matches.length !== 1)
      throw new Error(`CSV needs exactly one "${column}" column`);
    return matches[0];
  });

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_MARKET_PRINTS) {
    throw new Error(
      `CSV exceeds the ${MAX_MARKET_PRINTS.toLocaleString()}-print limit`,
    );
  }

  return dataRows.map((values, index): MarketPrint => {
    const rowNumber = index + 2;
    const [time, sideValue, price, size, venueValue] = indexes.map((column) =>
      (values[column] ?? '').trim(),
    );
    const side = sideValue.toLowerCase();
    const venue = venueValue.toUpperCase();

    if (!isClockTime(time))
      throw new Error(`Row ${rowNumber}: time must use a valid HH:MM:SS value`);
    if (side !== 'buy' && side !== 'sell')
      throw new Error(`Row ${rowNumber}: side must be buy or sell`);
    if (
      !/^\d+(?:\.\d{1,6})?$/.test(price) ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      throw new Error(`Row ${rowNumber}: price must be a positive number`);
    }
    if (
      !/^\d+$/.test(size) ||
      !Number.isSafeInteger(Number(size)) ||
      Number(size) <= 0
    ) {
      throw new Error(`Row ${rowNumber}: size must be a positive whole number`);
    }
    if (!/^[A-Z0-9._-]{1,12}$/.test(venue))
      throw new Error(
        `Row ${rowNumber}: venue must be 1–12 letters or numbers`,
      );

    return [time, side, price, size, venue];
  });
}
