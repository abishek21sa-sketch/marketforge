import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMarketPrintList,
  parseMarketPrintCsv,
  type MarketPrint,
} from './market-data.ts';

test('parses quoted CSV fields, reordered headers, BOM, and CRLF', () => {
  const csv =
    '\uFEFFvenue,price,time,side,size,note\r\n"xnas",182.41,09:41:00,BUY,420,"opening, print"\r\nBATS,182.40,09:41:03,sell,185,ok';
  assert.deepEqual(parseMarketPrintCsv(csv), [
    ['09:41:00', 'buy', '182.41', '420', 'XNAS'],
    ['09:41:03', 'sell', '182.40', '185', 'BATS'],
  ] satisfies MarketPrint[]);
});

test('rejects malformed headers, rows, and quoted CSV', () => {
  assert.throws(
    () => parseMarketPrintCsv('time,side,price,size\n09:41:00,buy,10,20'),
    /venue/,
  );
  assert.throws(
    () =>
      parseMarketPrintCsv(
        'time,side,price,size,venue\n25:00:00,buy,10,20,XNAS',
      ),
    /valid HH:MM:SS/,
  );
  assert.throws(
    () =>
      parseMarketPrintCsv(
        'time,side,price,size,venue\n09:41:00,hold,10,20,XNAS',
      ),
    /buy or sell/,
  );
  assert.throws(
    () =>
      parseMarketPrintCsv('time,side,price,size,venue\n09:41:00,buy,0,20,XNAS'),
    /positive number/,
  );
  assert.throws(
    () =>
      parseMarketPrintCsv(
        'time,side,price,size,venue\n09:41:00,buy,10,2.5,XNAS',
      ),
    /whole number/,
  );
  assert.throws(
    () =>
      parseMarketPrintCsv(
        'time,side,price,size,venue\n09:41:00,buy,10,20,"XNAS',
      ),
    /unclosed quoted field/,
  );
  assert.throws(
    () =>
      parseMarketPrintCsv(
        'time,side,price,size,venue\n09:41:00,buy,10,20,XN"AS',
      ),
    /quote in an unquoted field/,
  );
});

test('caps imported rows and validates restored session datasets', () => {
  const header = 'time,side,price,size,venue';
  const row = '09:41:00,buy,10,20,XNAS';
  assert.throws(
    () =>
      parseMarketPrintCsv(
        [header, ...Array.from({ length: 1001 }, () => row)].join('\n'),
      ),
    /1,000-print limit/,
  );
  assert.equal(
    isMarketPrintList([['09:41:00', 'buy', '182.41', '420', 'XNAS']]),
    true,
  );
  assert.equal(
    isMarketPrintList([['25:41:00', 'buy', '182.41', '420', 'XNAS']]),
    false,
  );
  assert.equal(isMarketPrintList([]), false);
});
