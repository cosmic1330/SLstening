import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("./phoneapp-sync.gs", import.meta.url), "utf8");

const validGroups = [{
  id: "group-1",
  name: "追蹤",
  stocks: [{ symbol: "2330", name: "台積電", price: "---", change: "0.0", isPositive: true }],
}];

const loadScript = ({ row = null, throwOnSet = false } = {}) => {
  const headers = ["uuid", "email", "data", "建立時間", "最後同步時間"];
  const rows = [headers, ...(row ? [row] : [])];
  const lockState = { tryCount: 0, releaseCount: 0 };
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: (values) => { rows.push([...values]); },
    getRange: (rowNumber, column, rowCount, columnCount) => ({
      getValues: () => {
        return Array.from({ length: rowCount }, (_, rowOffset) => {
          const source = rows[rowNumber - 1 + rowOffset] || [];
          return Array.from({ length: columnCount }, (_, columnOffset) => source[column - 1 + columnOffset] ?? "");
        });
      },
      getValue: () => (rows[rowNumber - 1] || [])[column - 1] ?? "",
      setValues: (values) => {
        if (throwOnSet) throw new Error("simulated sheet write failure");
        values.forEach((valuesForRow, rowOffset) => {
          const target = rows[rowNumber - 1 + rowOffset] || [];
          valuesForRow.forEach((value, columnOffset) => {
            target[column - 1 + columnOffset] = value;
          });
          rows[rowNumber - 1 + rowOffset] = target;
        });
      },
    }),
  };
  const context = {
    console,
    SpreadsheetApp: { openById: () => ({ getSheets: () => [sheet] }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (value) => ({ value, setMimeType: () => ({ value }) }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { lockState.tryCount += 1; return true; },
        releaseLock: () => { lockState.releaseCount += 1; },
      }),
    },
    Utilities: { formatDate: () => "2026/10/08 12:00:00" },
  };
  vm.runInNewContext(source, context, { filename: "phoneapp-sync.gs" });
  context.__rows = rows;
  context.__lockState = lockState;
  return context;
};

test("PhoneApp data validator accepts the exact groups shape and rejects desktop fields", () => {
  const script = loadScript();
  assert.equal(script.normalizePhoneData_(JSON.stringify(validGroups)), JSON.stringify(validGroups));
  assert.throws(
    () => script.normalizePhoneData_(JSON.stringify([{ ...validGroups[0], marketGroup: "TW" }])),
    (error) => error.code === "INVALID_GROUP",
  );
  assert.throws(
    () => script.normalizePhoneData_(JSON.stringify([{ ...validGroups[0], stocks: [{ ...validGroups[0].stocks[0], marketType: "stock" }] }])),
    (error) => error.code === "INVALID_STOCK",
  );
});

test("pull accepts uuid without email while sync still requires email", () => {
  const script = loadScript();
  assert.equal(script.parseRequest_({ postData: { contents: JSON.stringify({ action: "pull", uuid: "user-1" }) } }).uuid, "user-1");
  assert.equal(script.parseRequest_({ postData: { contents: JSON.stringify({ action: "pull", uuid: "user-1", email: null }) } }).uuid, "user-1");
  assert.throws(
    () => script.parseRequest_({ postData: { contents: JSON.stringify({ action: "sync", uuid: "user-1", data: "[]" }) } }),
    (error) => error.code === "INVALID_EMAIL",
  );
});

test("pull returns empty only for a missing row and flags corrupt stored cells", () => {
  const missing = loadScript();
  const missingResponse = JSON.parse(missing.handlePull_("user-1", null).value);
  assert.equal(missingResponse.status, "success");
  assert.equal(missingResponse.data, "[]");

  for (const storedData of ["", 0, "not-json", JSON.stringify({ stocks: [] })]) {
    const script = loadScript({ row: ["user-1", "user@example.com", storedData, "created", "updated"] });
    assert.throws(
      () => script.handlePull_("user-1", null),
      (error) => error.code === "CORRUPT_STORED_DATA",
      `expected corrupt stored data for ${JSON.stringify(storedData)}`,
    );
  }
});

test("sync inserts and updates one serialized groups string and releases the lock", () => {
  const script = loadScript();
  const firstData = JSON.stringify(validGroups);
  const firstResponse = JSON.parse(script.handleSync_("user-1", "user@example.com", firstData).value);
  assert.equal(firstResponse.status, "success");
  assert.equal(script.__rows.length, 2);
  assert.equal(script.__rows[1][2], firstData);

  const updatedGroups = [{ ...validGroups[0], name: "更新" }];
  const secondData = JSON.stringify(updatedGroups);
  const secondResponse = JSON.parse(script.handleSync_("user-1", "user@example.com", secondData).value);
  assert.equal(secondResponse.status, "success");
  assert.equal(script.__rows.length, 2);
  assert.equal(script.__rows[1][2], secondData);
  assert.notEqual(script.__rows[1][2], JSON.stringify(firstData));
  assert.equal(script.__lockState.tryCount, 2);
  assert.equal(script.__lockState.releaseCount, 2);

  const failing = loadScript({
    row: ["user-1", "user@example.com", firstData, "created", "updated"],
    throwOnSet: true,
  });
  assert.throws(() => failing.handleSync_("user-1", "user@example.com", firstData), /simulated sheet write failure/);
  assert.equal(failing.__lockState.releaseCount, 1);
});

test("sync validation enforces the character, group, and unique-stock limits", () => {
  const script = loadScript();
  assert.throws(
    () => script.normalizePhoneData_("x".repeat(45001)),
    (error) => error.code === "DATA_LIMIT_EXCEEDED",
  );
  assert.throws(
    () => script.normalizePhoneData_(JSON.stringify(Array.from({ length: 101 }, (_, index) => ({ id: `group-${index}`, name: "", stocks: [] })))),
    (error) => error.code === "INVALID_GROUPS",
  );
  const tooManyStocks = [{
    id: "group-1",
    name: "追蹤",
    stocks: Array.from({ length: 301 }, (_, index) => ({ symbol: `US${index}`, name: "Stock", price: "---", change: "0.0", isPositive: true })),
  }];
  assert.throws(
    () => script.normalizePhoneData_(JSON.stringify(tooManyStocks)),
    (error) => error.code === "DATA_LIMIT_EXCEEDED",
  );
});
