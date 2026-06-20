# AGENTS.md

## Общие правила проекта

- Язык общения с владельцем проекта: русский.
- Это статический свадебный сайт без npm, сборщика и внешнего frontend-фреймворка.
- Не добавлять build step, пакетный менеджер или тяжелые зависимости без явной необходимости.
- Основные файлы сайта:
  - `index.html` - структура страницы и RSVP-блок.
  - `styles.css` - стили.
  - `script.js` - клиентская логика RSVP, загрузка группы и отправка ответов.
  - `.github/workflows/pages.yml` - публикация на GitHub Pages.
- Серверная часть для Google Sheets лежит в `apps-script/Code.js`.
- Файл `apps-script/Code.js` нужно копировать целиком в Google Apps Script editor и после изменений деплоить новой версией.

## Текущая интеграция

- Сайт опубликован как GitHub Pages.
- RSVP работает через Google Apps Script Web App.
- URL Apps Script хранится в `APPS_SCRIPT_URL` в `script.js`.
- Google Sheet id хранится в `SPREADSHEET_ID` в `apps-script/Code.js`.
- Гости открывают сайт со ссылкой вида:

```text
?groupId=<uuid>
```

- `groupId` является bearer-ссылкой: кто знает ссылку, может видеть и менять ответы этой группы.
- Не хранить Google токены, OAuth credentials или service account keys во frontend-коде.

## Google Sheet

Текущая таблица:

```text
Алиса Александр 20.08.2026 Гости
https://docs.google.com/spreadsheets/d/10xKHWzBuQGq8lRdNE3C9WQTz4sdT8jGJbjjVtci_XsI/edit
```

### Лист `Guests`

Это технический лист, который читает и обновляет Apps Script.

Колонки должны существовать в первой строке именно с такими техническими именами:

```text
groupId
personId
lastName
firstName
phone
attendance
alcoholOptions
alcoholOther
transport
secondDayInvited
secondDayAttendance
secondDayStayOvernight
secondDayAlcoholOptions
secondDayAlcoholOther
updatedAt
```

Правила:

- Одна строка = один человек.
- `groupId` одинаковый у людей из одной пригласительной ссылки.
- `personId` уникален для каждого человека.
- `lastName` и `firstName` заполняются вручную и не редактируются на сайте.
- `secondDayInvited` заполняется вручную и управляет тем, видит ли гость вопросы второго дня.
- `phone`, `attendance`, `alcoholOptions`, `alcoholOther`, `transport`, `secondDayAttendance`, `secondDayStayOvernight`, `secondDayAlcoholOptions`, `secondDayAlcoholOther`, `updatedAt` обновляются сайтом через Apps Script.
- Не переименовывать технические заголовки в `Guests`, иначе `apps-script/Code.js` перестанет находить колонки.
- Если нужно поменять структуру `Guests`, сначала обновить `HEADERS` и логику чтения/записи в `apps-script/Code.js`.

Текущие человекочитаемые значения, которые записываются в таблицу:

```text
attendance:
Да
Нет
Пока не знаю

transport:
На трансфере
Своими силами

alcoholOptions:
Коктейли
Шампанское
Вино
Виски
Ром
Коньяк
Без алкоголя
```

`alcoholOther` соответствует полю сайта `Свой вариант`.

```text
secondDayInvited:
Да
Нет

secondDayAttendance:
Да
Нет
Пока не знаю

secondDayStayOvernight:
Да
Нет
Пока не знаю

secondDayAlcoholOptions:
Пиво
Сидр
Водка
Вино
Виски
Ром
Коньяк
Шампанское
Без алкоголя
```

`secondDayAlcoholOther` соответствует полю второго дня `Свой вариант`.

### Лист `Просмотр`

Это лист для удобного просмотра данных без id.

- Основные данные подтягиваются из `Guests`.
- `groupId` и `personId` не показываются.
- Справа от основных данных есть сводка:
  - `Общее`;
  - `Присутствие`;
  - `Транспорт`;
  - `Алкоголь`.
- Если меняется набор статусов, транспорта, алкоголя или русские подписи, нужно обновить формулы сводки на листе `Просмотр`.

## Обязательная синхронизация

При изменении RSVP-полей всегда держать в синхронизированном состоянии:

1. `script.js`
   - UI-опции в форме.
   - Значения `value` у radio/checkbox.
   - Валидация.
   - Payload, который уходит в Apps Script.

2. `apps-script/Code.js`
   - `HEADERS`.
   - Словари `ATTENDANCE_LABELS`, `ALCOHOL_LABELS`, `TRANSPORT_LABELS`.
   - Алиасы, если нужно поддерживать старые значения.
   - Валидация и запись в Google Sheet.

3. Google Sheet
   - Технические колонки листа `Guests`.
   - Русские значения, которые уже есть в данных.
   - Формулы и подписи сводки на листе `Просмотр`.

4. Документация
   - `apps-script/README.md`.
   - `docs/specs/google-sheets-group-rsvp.md`.

Пример: если добавляется новый алкоголь, нужно одновременно:

- добавить checkbox в `script.js`;
- добавить код и русскую подпись в `ALCOHOL_LABELS` в `apps-script/Code.js`;
- обновить сводку алкоголя на листе `Просмотр`;
- обновить документацию;
- скопировать новый `apps-script/Code.js` в Google Apps Script и задеплоить новую версию.

## Apps Script deployment

После любого изменения `apps-script/Code.js` нужно вручную обновить Google Apps Script:

```text
Apps Script editor -> заменить код -> Save
Deploy -> Manage deployments -> Edit -> Version -> New version -> Deploy
```

Если этого не сделать, опубликованный `/exec` URL продолжит выполнять старый код.

Настройки Web App:

```text
Execute as: Me
Who has access: Anyone
```

## Frontend deployment

После изменения `index.html`, `styles.css` или `script.js` нужно опубликовать изменения на GitHub Pages.

Если меняется `script.js`, обновить cache-busting query в `index.html`:

```html
<script src="script.js?v=..."></script>
```

Иначе браузер или GitHub Pages может отдать старый скрипт.

## Проверки

Минимальные локальные проверки:

```bash
node --check script.js
node --check apps-script/Code.js
python3 -m http.server 8010
```

Проверочные сценарии:

- Открыть сайт без `groupId`: RSVP показывает мягкую ошибку.
- Открыть сайт с неизвестным `groupId`: RSVP показывает мягкую ошибку.
- Открыть сайт с валидным `groupId`: гости подтягиваются из Google Sheet.
- Сохранить ответы и проверить `Guests`.
- Проверить, что `Просмотр` и сводка обновились.
- Проверить, что новые опции формы видны после hard refresh.

## Google Drive MCP

- Для операций с Google Sheets можно использовать Google Drive MCP.
- Перед массовыми изменениями таблицы желательно читать текущие значения или metadata, если нет rate limit.
- Если Google Sheets API отвечает `RATE_LIMITED`, не повторять агрессивно запросы чтения; использовать уже известные `sheetId` или подождать.
- Текущие известные `sheetId`:
  - `Guests`: `20260820`
  - `Просмотр`: `20260821`
