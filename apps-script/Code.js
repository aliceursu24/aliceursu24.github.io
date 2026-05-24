const SPREADSHEET_ID = "10xKHWzBuQGq8lRdNE3C9WQTz4sdT8jGJbjjVtci_XsI";
const SHEET_NAME = "Guests";

const HEADERS = [
  "groupId",
  "personId",
  "lastName",
  "firstName",
  "attendance",
  "alcoholOptions",
  "alcoholOther",
  "transport",
  "secondDayInvited",
  "secondDayAttendance",
  "secondDayStayOvernight",
  "secondDayAlcoholOptions",
  "secondDayAlcoholOther",
  "updatedAt",
];

const ATTENDANCE_LABELS = {
  yes: "Да",
  no: "Нет",
  unknown: "Пока не знаю",
};

const ALCOHOL_LABELS = {
  cocktails: "Коктейли",
  champagne: "Шампанское",
  wine: "Вино",
  whiskey: "Виски",
  rum: "Ром",
  cognac: "Коньяк",
  none: "Без алкоголя",
};

const ALCOHOL_ALIASES = {
  sparkling: "champagne",
  "Игристое": "champagne",
};

const SECOND_DAY_ALCOHOL_LABELS = {
  beer: "Пиво",
  cider: "Сидр",
  vodka: "Водка",
  wine: "Вино",
  whiskey: "Виски",
  rum: "Ром",
  cognac: "Коньяк",
  champagne: "Шампанское",
  none: "Без алкоголя",
};

const SECOND_DAY_ALCOHOL_ALIASES = {
  "водка": "vodka",
};

const TRANSPORT_LABELS = {
  transfer: "На трансфере",
  self: "Своими силами",
};

function doGet(event) {
  try {
    const action = getParameter_(event, "action");

    if (action !== "getGroup") {
      return json_({ ok: false, error: "Unknown action" }, 400);
    }

    const groupId = getParameter_(event, "groupId");
    const guests = getGuestsByGroup_(groupId);

    if (!groupId || guests.length === 0) {
      return json_({ ok: false, error: "Group not found" }, 404);
    }

    return json_({ ok: true, groupId, guests });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: "Internal error" }, 500);
  }
}

function doPost(event) {
  try {
    const payload = parsePostBody_(event);

    if (payload.action !== "saveGroup") {
      return json_({ ok: false, error: "Unknown action" }, 400);
    }

    saveGroup_(payload);

    return json_({ ok: true });
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: error.message || "Internal error" }, 400);
  }
}

function getGuestsByGroup_(groupId) {
  if (!groupId) {
    return [];
  }

  const table = readTable_();
  return table.rows
    .filter((row) => row.groupId === groupId)
    .map((row) => ({
      personId: row.personId,
      firstName: row.firstName,
      lastName: row.lastName,
      attendance: normalizeCode_(row.attendance, ATTENDANCE_LABELS, ""),
      alcoholOptions: normalizeAlcoholOptions_(row.alcoholOptions),
      alcoholOther: row.alcoholOther,
      transport: normalizeCode_(row.transport, TRANSPORT_LABELS, ""),
      secondDayInvited: parseBoolean_(row.secondDayInvited),
      secondDayAttendance: normalizeCode_(row.secondDayAttendance, ATTENDANCE_LABELS, ""),
      secondDayStayOvernight: normalizeCode_(row.secondDayStayOvernight, ATTENDANCE_LABELS, ""),
      secondDayAlcoholOptions: normalizeSecondDayAlcoholOptions_(row.secondDayAlcoholOptions),
      secondDayAlcoholOther: row.secondDayAlcoholOther,
    }));
}

function saveGroup_(payload) {
  const groupId = String(payload.groupId || "").trim();
  const guests = Array.isArray(payload.guests) ? payload.guests : [];

  if (!groupId || guests.length === 0) {
    throw new Error("Invalid group payload");
  }

  const table = readTable_();
  const guestByPersonId = new Map();

  guests.forEach((guest) => {
    if (guest && guest.personId) {
      guestByPersonId.set(String(guest.personId), guest);
    }
  });

  const now = new Date().toISOString();
  let updatedRows = 0;

  table.rows.forEach((row) => {
    if (row.groupId !== groupId || !guestByPersonId.has(row.personId)) {
      return;
    }

    const guest = guestByPersonId.get(row.personId);
    const attendance = normalizeCode_(guest.attendance, ATTENDANCE_LABELS, "");

    if (!attendance) {
      throw new Error("Attendance is required for every guest");
    }

    const shouldClearDetails = attendance === "no";
    const alcoholOptions = shouldClearDetails ? [] : normalizeAlcoholOptions_(guest.alcoholOptions);
    const alcoholOther = shouldClearDetails ? "" : String(guest.alcoholOther || "").trim();
    const transport = shouldClearDetails
      ? ""
      : normalizeCode_(guest.transport, TRANSPORT_LABELS, "");

    if (!shouldClearDetails && !transport) {
      throw new Error("Transport is required for attending guests");
    }

    if (!shouldClearDetails && alcoholOptions.length === 0 && !alcoholOther) {
      throw new Error("Alcohol choice is required for attending guests");
    }

    const secondDayInvited = parseBoolean_(row.secondDayInvited);
    const secondDayAttendance = secondDayInvited
      ? normalizeCode_(guest.secondDayAttendance, ATTENDANCE_LABELS, "")
      : "";

    if (secondDayInvited && !secondDayAttendance) {
      throw new Error("Second day attendance is required for invited guests");
    }

    const shouldClearSecondDayDetails = !secondDayInvited || secondDayAttendance === "no";
    const secondDayStayOvernight = shouldClearSecondDayDetails
      ? ""
      : normalizeCode_(guest.secondDayStayOvernight, ATTENDANCE_LABELS, "");
    const secondDayAlcoholOptions = shouldClearSecondDayDetails
      ? []
      : normalizeSecondDayAlcoholOptions_(guest.secondDayAlcoholOptions);
    const secondDayAlcoholOther = shouldClearSecondDayDetails
      ? ""
      : String(guest.secondDayAlcoholOther || "").trim();

    if (!shouldClearSecondDayDetails && !secondDayStayOvernight) {
      throw new Error("Second day overnight answer is required for invited guests");
    }

    if (
      !shouldClearSecondDayDetails &&
      secondDayAlcoholOptions.length === 0 &&
      !secondDayAlcoholOther
    ) {
      throw new Error("Second day alcohol choice is required for invited guests");
    }

    updateCell_(table.sheet, row.rowNumber, table.headerMap.attendance, labelFor_(ATTENDANCE_LABELS, attendance));
    updateCell_(table.sheet, row.rowNumber, table.headerMap.alcoholOptions, labelsFor_(ALCOHOL_LABELS, alcoholOptions).join(", "));
    updateCell_(table.sheet, row.rowNumber, table.headerMap.alcoholOther, alcoholOther);
    updateCell_(table.sheet, row.rowNumber, table.headerMap.transport, labelFor_(TRANSPORT_LABELS, transport));
    updateCell_(table.sheet, row.rowNumber, table.headerMap.secondDayAttendance, labelFor_(ATTENDANCE_LABELS, secondDayAttendance));
    updateCell_(table.sheet, row.rowNumber, table.headerMap.secondDayStayOvernight, labelFor_(ATTENDANCE_LABELS, secondDayStayOvernight));
    updateCell_(
      table.sheet,
      row.rowNumber,
      table.headerMap.secondDayAlcoholOptions,
      labelsFor_(SECOND_DAY_ALCOHOL_LABELS, secondDayAlcoholOptions).join(", "),
    );
    updateCell_(table.sheet, row.rowNumber, table.headerMap.secondDayAlcoholOther, secondDayAlcoholOther);
    updateCell_(table.sheet, row.rowNumber, table.headerMap.updatedAt, now);
    updatedRows += 1;
  });

  if (updatedRows !== guestByPersonId.size) {
    throw new Error("One or more guests were not found");
  }
}

function readTable_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error("Guests sheet not found");
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const headerMap = {};

  headers.forEach((header, index) => {
    headerMap[String(header).trim()] = index + 1;
  });

  HEADERS.forEach((header) => {
    if (!headerMap[header]) {
      throw new Error("Missing column: " + header);
    }
  });

  const rows = values.slice(1).map((cells, index) => {
    const row = { rowNumber: index + 2 };

    HEADERS.forEach((header) => {
      row[header] = String(cells[headerMap[header] - 1] || "").trim();
    });

    return row;
  });

  return { sheet, headerMap, rows };
}

function updateCell_(sheet, rowNumber, columnNumber, value) {
  sheet.getRange(rowNumber, columnNumber).setValue(value);
}

function parsePostBody_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("Empty request body");
  }

  return JSON.parse(event.postData.contents);
}

function splitOptions_(value) {
  return String(value || "")
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
}

function normalizeAlcoholOptions_(options) {
  const source = Array.isArray(options) ? options : splitOptions_(options);
  const normalized = source
    .map((option) => normalizeCode_(option, ALCOHOL_LABELS, "", ALCOHOL_ALIASES))
    .filter(Boolean);

  if (normalized.indexOf("none") !== -1) {
    return ["none"];
  }

  return normalized.filter((option, index) => normalized.indexOf(option) === index);
}

function normalizeSecondDayAlcoholOptions_(options) {
  const source = Array.isArray(options) ? options : splitOptions_(options);
  const normalized = source
    .map((option) => normalizeCode_(option, SECOND_DAY_ALCOHOL_LABELS, "", SECOND_DAY_ALCOHOL_ALIASES))
    .filter(Boolean);

  if (normalized.indexOf("none") !== -1) {
    return ["none"];
  }

  return normalized.filter((option, index) => normalized.indexOf(option) === index);
}

function normalizeCode_(value, labels, fallback, aliases) {
  const normalized = String(value || "").trim();

  if (aliases && Object.prototype.hasOwnProperty.call(aliases, normalized)) {
    return aliases[normalized];
  }

  if (Object.prototype.hasOwnProperty.call(labels, normalized)) {
    return normalized;
  }

  const labelEntry = Object.keys(labels).find((code) => labels[code] === normalized);
  return labelEntry || fallback;
}

function labelFor_(labels, code) {
  return labels[code] || "";
}

function labelsFor_(labels, codes) {
  return codes.map((code) => labelFor_(labels, code)).filter(Boolean);
}

function parseBoolean_(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "да"].indexOf(normalized) !== -1;
}

function getParameter_(event, name) {
  return event && event.parameter ? String(event.parameter[name] || "").trim() : "";
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
