# Google Apps Script RSVP API

## Setup

1. Create a Google Sheet with a sheet named `Guests`.
2. Add the header row:

```text
groupId | personId | lastName | firstName | phone | attendance | alcoholOptions | alcoholOther | transport | secondDayInvited | secondDayAttendance | secondDayStayOvernight | secondDayAlcoholOptions | secondDayAlcoholOther | updatedAt
```

3. Fill one row per guest. `groupId` and `personId` should be UUID values.
   Set `secondDayInvited` to `Да` only for guests invited to the second day.
4. Create a Google Apps Script project bound to the spreadsheet or standalone.
5. Paste `Code.js` into the Apps Script editor.
6. The created spreadsheet id is already set in `Code.js`. If you switch to another sheet later, replace `SPREADSHEET_ID` with the new spreadsheet id from the Google Sheet URL.
7. Deploy as a Web App:
   - Execute as: `Me`
   - Who has access: `Anyone`
8. Copy the `/exec` Web App URL and paste it into `APPS_SCRIPT_URL` in `script.js`.

## API

Read a group:

```text
GET <web-app-url>?action=getGroup&groupId=<uuid>
```

Save a group:

```text
POST <web-app-url>
Content-Type: text/plain;charset=utf-8
```

```json
{
  "action": "saveGroup",
  "groupId": "uuid",
  "guests": [
    {
      "personId": "uuid",
      "phone": "+7 999 123-45-67",
      "attendance": "yes",
      "alcoholOptions": ["wine"],
      "alcoholOther": "",
      "transport": "transfer",
      "secondDayAttendance": "yes",
      "secondDayStayOvernight": "unknown",
      "secondDayAlcoholOptions": ["beer", "cider"],
      "secondDayAlcoholOther": ""
    }
  ]
}
```

The script ignores names from write requests and updates only existing rows matching
`groupId + personId`.

The frontend API still sends stable internal values such as `yes`, `wine`, and
`transfer`, but the script writes human-readable Russian labels to the sheet:
`Да`, `Коктейли`, `Шампанское`, `На трансфере`, and so on.

Second day fields are returned and accepted only for rows where
`secondDayInvited` is truthy (`Да`, `yes`, `true`, or `1`). For the second day,
the alcohol codes are `beer`, `cider`, `vodka`, `wine`, `whiskey`, `rum`,
`cognac`, `champagne`, and `none`.
