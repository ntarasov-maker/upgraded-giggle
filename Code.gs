/**
 * Google Apps Script webhook for logging CDP events into Google Sheets
 * and sending Telegram notifications for POLICY_PURCHASE events.
 *
 * Required Script Properties:
 * - SPREADSHEET_ID
 * - SHEET_NAME
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID
 */

var BASE_HEADERS = ['Event Name', 'Receipt Time'];
var TARGET_GOAL = 'POLICY_PURCHASE';

/**
 * Entry point for POST requests.
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  var receiptTime = new Date();
  var receiptIso = receiptTime.toISOString();
  var response = {
    ok: true,
    sheet_ok: false,
    telegram_ok: false,
    goal: null,
    receipt_time: receiptIso,
    error_message: null
  };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Request body is empty. Expected application/json payload.');
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      throw new Error('Invalid JSON payload: ' + parseError.message);
    }

    var goal = extractGoal(payload);
    var pixelData = extractPixelData(payload);
    response.goal = goal;

    var writeResult = appendEventToSheet(goal, receiptTime, pixelData);
    response.sheet_ok = writeResult.sheet_ok;

    if (goal === TARGET_GOAL) {
      var telegramText = buildTelegramMessage(pixelData);
      response.telegram_ok = sendTelegramMessage(telegramText);
    } else {
      response.telegram_ok = false;
    }
  } catch (error) {
    response.ok = false;
    response.error_message = String(error && error.message ? error.message : error);
    Logger.log('Webhook processing error: ' + response.error_message);
    console.error('Webhook processing error', error);
  }

  return jsonResponse(response);
}

/**
 * Returns first goal name from payload.goals[0].goal if available.
 * @param {Object} payload
 * @returns {string|null}
 */
function extractGoal(payload) {
  if (!payload || !Array.isArray(payload.goals) || payload.goals.length === 0) {
    return null;
  }

  var firstGoal = payload.goals[0];
  if (!firstGoal || typeof firstGoal.goal === 'undefined' || firstGoal.goal === null) {
    return null;
  }

  return String(firstGoal.goal);
}

/**
 * Extracts pixel_data object and normalizes it to plain object.
 * @param {Object} payload
 * @returns {Object}
 */
function extractPixelData(payload) {
  if (!payload || typeof payload.pixel_data !== 'object' || payload.pixel_data === null || Array.isArray(payload.pixel_data)) {
    return {};
  }

  return payload.pixel_data;
}

/**
 * Appends event row into configured spreadsheet.
 * Adds missing headers for new pixel_data keys.
 * @param {string|null} goal
 * @param {Date} receiptTime
 * @param {Object} pixelData
 * @returns {{sheet_ok: boolean}}
 */
function appendEventToSheet(goal, receiptTime, pixelData) {
  var scriptProps = PropertiesService.getScriptProperties();
  var spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');
  var sheetName = scriptProps.getProperty('SHEET_NAME');

  if (!spreadsheetId || !sheetName) {
    throw new Error('Missing script properties: SPREADSHEET_ID and SHEET_NAME are required.');
  }

  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  var pixelKeys = Object.keys(pixelData);
  var headers = ensureHeaders(sheet, pixelKeys);
  var rowValues = buildRowValues(headers, goal, receiptTime, pixelData);

  sheet.appendRow(rowValues);

  return { sheet_ok: true };
}

/**
 * Ensures header row exists and contains all required keys.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} pixelKeys
 * @returns {string[]}
 */
function ensureHeaders(sheet, pixelKeys) {
  var lastColumn = sheet.getLastColumn();
  var headers = [];

  if (lastColumn > 0) {
    headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  }

  if (headers.length === 0 || String(headers[0]).trim() === '') {
    headers = BASE_HEADERS.slice();
  } else {
    headers[0] = BASE_HEADERS[0];
    if (headers.length < 2) {
      headers.push(BASE_HEADERS[1]);
    } else {
      headers[1] = BASE_HEADERS[1];
    }
  }

  for (var i = 0; i < pixelKeys.length; i++) {
    if (headers.indexOf(pixelKeys[i]) === -1) {
      headers.push(pixelKeys[i]);
    }
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers;
}

/**
 * Builds row values based on current header order.
 * @param {string[]} headers
 * @param {string|null} goal
 * @param {Date} receiptTime
 * @param {Object} pixelData
 * @returns {Array<*>}
 */
function buildRowValues(headers, goal, receiptTime, pixelData) {
  var row = new Array(headers.length);

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];

    if (header === BASE_HEADERS[0]) {
      row[i] = goal;
      continue;
    }

    if (header === BASE_HEADERS[1]) {
      row[i] = receiptTime;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(pixelData, header)) {
      row[i] = normalizeCellValue(pixelData[header]);
    } else {
      row[i] = '';
    }
  }

  return row;
}

/**
 * Normalizes values before writing into a cell.
 * @param {*} value
 * @returns {*}
 */
function normalizeCellValue(value) {
  if (typeof value === 'undefined' || value === null) {
    return '';
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

/**
 * Creates Telegram message for POLICY_PURCHASE event.
 * @param {Object} pixelData
 * @returns {string}
 */
function buildTelegramMessage(pixelData) {
  var policyNo = pixelData && pixelData.POLICY_NO ? String(pixelData.POLICY_NO) : 'N/A';
  var sum = pixelData && pixelData.SUM ? String(pixelData.SUM) : 'N/A';
  var currency = pixelData && pixelData.CURRENCY ? String(pixelData.CURRENCY) : '';

  return '💰 Прошла оплата! Полис: ' + policyNo + '. Сумма: ' + sum + ' ' + currency + '.';
}

/**
 * Sends Telegram notification via Bot API.
 * @param {string} text
 * @returns {boolean}
 */
function sendTelegramMessage(text) {
  var scriptProps = PropertiesService.getScriptProperties();
  var botToken = scriptProps.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = scriptProps.getProperty('TELEGRAM_CHAT_ID');

  if (!botToken || !chatId) {
    throw new Error('Missing script properties: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.');
  }

  var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
  var payload = {
    chat_id: chatId,
    text: text
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var telegramResponse = UrlFetchApp.fetch(url, options);
    var statusCode = telegramResponse.getResponseCode();

    if (statusCode < 200 || statusCode >= 300) {
      Logger.log('Telegram API non-2xx response: ' + statusCode + ' body=' + telegramResponse.getContentText());
      return false;
    }

    var body = {};
    try {
      body = JSON.parse(telegramResponse.getContentText());
    } catch (parseError) {
      Logger.log('Failed to parse Telegram API response JSON: ' + parseError.message);
      return false;
    }

    if (!body.ok) {
      Logger.log('Telegram API returned ok=false: ' + telegramResponse.getContentText());
      return false;
    }

    return true;
  } catch (error) {
    Logger.log('Telegram request failed: ' + error.message);
    console.error('Telegram request failed', error);
    return false;
  }
}

/**
 * Standard JSON response helper.
 * @param {Object} body
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
