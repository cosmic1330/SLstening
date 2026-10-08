/**
 * SLstening PhoneApp-compatible backup Web App.
 *
 * Deploy manually as a Web app (execute as the owner, access: anyone) and
 * configure the resulting URL in the desktop build if it changes. PhoneApp
 * requests remain compatible: {action: "pull"|"sync", uuid, email, data}.
 * No Supabase token is required; uuid is the immutable Supabase user id.
 */

// Keep this empty while the desktop app shares the endpoint. The desktop
// client uses PhoneApp's uuid/email request contract and does not send the
// optional PhoneApp token.
var SECURITY_TOKEN = "";
var SPREADSHEET_ID = "1-y1vvCipDZ1TS6Yp09LN0PYrZMJejUHUmuWZ9Pt7euM";
var API_SCHEMA_VERSION = 1;
var MAX_DATA_LENGTH = 45000;
var MAX_GROUPS = 100;
var MAX_STOCKS = 300;
var SHEET_HEADERS = ["uuid", "email", "data", "建立時間", "最後同步時間", "類型"];

function doPost(event) {
  try {
    var request = parseRequest_(event);
    if (SECURITY_TOKEN && request.token !== SECURITY_TOKEN) {
      throw apiError_("UNAUTHORIZED", "Unauthorized token");
    }
    if (request.action === "ping") {
      return jsonResponse_({status: "success", schema_version: API_SCHEMA_VERSION, message: "pong"});
    }
    if (request.action === "pull") return handlePull_(request.uuid, request.email, request.type);
    if (request.action === "sync") return handleSync_(request.uuid, request.email, request.data, request.type);
    throw apiError_("UNKNOWN_ACTION", "Invalid action");
  } catch (error) {
    var code = error && error.code ? error.code : "INTERNAL_ERROR";
    var message = error && error.message ? error.message : "Server error";
    console.error("[PhoneApp Sync] " + code + ": " + message);
    return jsonResponse_({status: "error", code: code, message: message});
  }
}

function parseRequest_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw apiError_("INVALID_REQUEST", "Missing POST JSON");
  }
  var request;
  try {
    request = JSON.parse(event.postData.contents);
  } catch (error) {
    throw apiError_("INVALID_JSON", "POST content is not valid JSON");
  }
  if (!isPlainObject_(request) || typeof request.action !== "string") {
    throw apiError_("INVALID_REQUEST", "Invalid request shape");
  }
  if (request.action === "pull") {
    requireUuid_(request.uuid);
    validateOptionalEmail_(request.email);
  } else if (request.action === "sync") {
    requireIdentity_(request.uuid, request.email);
  }
  request.type = normalizeClientType_(request.type);
  return request;
}

function normalizeClientType_(type) {
  if (type === undefined || type === null || type === "") return "Mobile";
  if (type === "Desktop" || type === "Mobile") return type;
  throw apiError_("INVALID_CLIENT_TYPE", "type must be Desktop or Mobile");
}

function requireIdentity_(uuid, email) {
  requireUuid_(uuid);
  if (typeof email !== "string" || !email.trim() || email.length > 320) {
    throw apiError_("INVALID_EMAIL", "Missing or invalid email");
  }
}

function requireUuid_(uuid) {
  if (typeof uuid !== "string" || !uuid.trim() || uuid.length > 200) {
    throw apiError_("INVALID_UUID", "Missing or invalid uuid");
  }
}

function validateOptionalEmail_(email) {
  if (email === undefined || email === null || email === "") return;
  if (typeof email !== "string" || !email.trim() || email.length > 320) {
    throw apiError_("INVALID_EMAIL", "Missing or invalid email");
  }
}

function handlePull_(uuid, email, type) {
  type = normalizeClientType_(type);
  var sheet = getDataSheet_();
  var rowNumber = findUserRow_(sheet, uuid, type);
  if (!rowNumber) {
    // A missing backup is an empty account, not a legacy-import state.
    return jsonResponse_({status: "success", schema_version: API_SCHEMA_VERSION, data: "[]", updated_at: null});
  }
  var row = sheet.getRange(rowNumber, 1, 1, SHEET_HEADERS.length).getValues()[0];
  var rowEmail = String(row[1] || "");
  if (email && email !== "Guest" && rowEmail && rowEmail !== "Guest" && rowEmail !== email) {
    throw apiError_("EMAIL_MISMATCH", "The email does not match this backup");
  }
  var data = row[2];
  if (typeof data !== "string" || !data.length) {
    throw apiError_("CORRUPT_STORED_DATA", "Stored backup data is invalid");
  }
  try {
    validatePhoneData_(data);
  } catch (error) {
    throw apiError_("CORRUPT_STORED_DATA", "Stored backup data is invalid");
  }
  return jsonResponse_({status: "success", schema_version: API_SCHEMA_VERSION, data: data, updated_at: row[4] || null});
}

function handleSync_(uuid, email, data, type) {
  type = normalizeClientType_(type);
  requireIdentity_(uuid, email);
  var normalizedData = normalizePhoneData_(data);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw apiError_("BUSY", "Data is being updated; retry shortly");
  try {
    var sheet = getDataSheet_();
    var rowNumber = findUserRow_(sheet, uuid, type);
    var now = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd HH:mm:ss");
    if (rowNumber) {
      sheet.getRange(rowNumber, 2, 1, 5).setValues([[email, normalizedData, sheet.getRange(rowNumber, 4).getValue() || now, now, type]]);
      return jsonResponse_({status: "success", action: "update", updated_at: now});
    }
    sheet.appendRow([uuid, email, normalizedData, now, now, type]);
    return jsonResponse_({status: "success", action: "insert", updated_at: now});
  } finally {
    lock.releaseLock();
  }
}

function normalizePhoneData_(data) {
  if (typeof data === "string") {
    if (data.length > MAX_DATA_LENGTH) throw apiError_("DATA_LIMIT_EXCEEDED", "Data is too large");
    validatePhoneData_(data);
    return data;
  }
  if (Array.isArray(data)) {
    var serialized = JSON.stringify(data);
    if (serialized.length > MAX_DATA_LENGTH) throw apiError_("DATA_LIMIT_EXCEEDED", "Data is too large");
    validatePhoneGroups_(data);
    return serialized;
  }
  throw apiError_("INVALID_DATA", "data must be a PhoneApp groups JSON string");
}

function validatePhoneData_(data) {
  if (typeof data !== "string" || data.length > MAX_DATA_LENGTH) {
    throw apiError_("DATA_LIMIT_EXCEEDED", "Data is too large");
  }
  var groups;
  try {
    groups = JSON.parse(data);
  } catch (error) {
    throw apiError_("INVALID_DATA", "data is not valid JSON");
  }
  validatePhoneGroups_(groups);
}

function validatePhoneGroups_(groups) {
  if (!Array.isArray(groups) || groups.length > MAX_GROUPS) {
    throw apiError_("INVALID_GROUPS", "data must contain at most 100 groups");
  }
  var groupIds = {};
  var stockIds = {};
  var uniqueStocks = 0;
  groups.forEach(function(group) {
    requireExactKeys_(group, ["id", "name", "stocks"], "INVALID_GROUP");
    if (typeof group.id !== "string" || !group.id.trim() || group.id.length > 200 || groupIds[group.id]) {
      throw apiError_("INVALID_GROUP", "Group id is missing or duplicated");
    }
    if (typeof group.name !== "string" || group.name.length > 200 || !Array.isArray(group.stocks)) {
      throw apiError_("INVALID_GROUP", "Invalid group fields");
    }
    groupIds[group.id] = true;
    var members = {};
    group.stocks.forEach(function(stock) {
      requireExactKeys_(stock, ["symbol", "name", "price", "change", "isPositive"], "INVALID_STOCK");
      if (typeof stock.symbol !== "string" || !stock.symbol.trim() || stock.symbol.length > 40 || members[stock.symbol]) {
        throw apiError_("INVALID_STOCK", "Stock symbol is missing or duplicated in a group");
      }
      if (typeof stock.name !== "string" || stock.name.length > 200 || typeof stock.price !== "string" || typeof stock.change !== "string" || typeof stock.isPositive !== "boolean") {
        throw apiError_("INVALID_STOCK", "Invalid stock fields");
      }
      members[stock.symbol] = true;
      if (!stockIds[stock.symbol]) {
        stockIds[stock.symbol] = true;
        uniqueStocks += 1;
      }
    });
  });
  if (uniqueStocks > MAX_STOCKS) throw apiError_("DATA_LIMIT_EXCEEDED", "Too many unique stocks");
}

function requireExactKeys_(value, expected, code) {
  if (!isPlainObject_(value)) throw apiError_(code, "Invalid object");
  var actual = Object.keys(value).sort();
  var wanted = expected.slice().sort();
  if (actual.length !== wanted.length || actual.some(function(key, index) { return key !== wanted[index]; })) {
    throw apiError_(code, "Unexpected fields in PhoneApp data");
  }
}

function getDataSheet_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(SHEET_HEADERS);
  var headers = sheet.getRange(1, 1, 1, SHEET_HEADERS.length).getValues()[0];
  if (headers.join("|") !== SHEET_HEADERS.join("|")) {
    throw apiError_("SHEET_SCHEMA_INVALID", "The first row must contain uuid,email,data,建立時間,最後同步時間,類型");
  }
  return sheet;
}

function findUserRow_(sheet, uuid, type) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  for (var index = 0; index < values.length; index += 1) {
    var rowType = String(values[index][5] || "").trim() || "Mobile";
    if (String(values[index][0]) === uuid && rowType === type) return index + 2;
  }
  return 0;
}

function isPlainObject_(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function apiError_(code, message) {
  var error = new Error(message);
  error.code = code;
  return error;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
