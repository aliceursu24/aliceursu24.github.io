# Google Sheets RSVP для групп гостей

## 1. Title and summary

Свадебный сайт использует Google Sheet как источник данных для гостей и RSVP-ответов. GitHub Pages остается публичным хостингом сайта, а Google Apps Script выступает минимальным API между фронтендом и таблицей, чтобы не раскрывать доступ на запись.

## 2. Goals and success criteria

- Гость открывает ссылку с `groupId` и видит одинаковую свадебную страницу.
- RSVP-блок загружает всех людей группы из Google Sheet.
- Имя и фамилия каждого гостя отображаются как неизменяемый текст.
- Гость сохраняет ответы всей группы одной кнопкой.
- Повторный вход по ссылке показывает ранее сохраненные ответы.
- Доступ к Google Sheet не хранится в публичном `script.js`.
- Гости, приглашенные на второй день, видят дополнительные вопросы второго дня.

## 3. Scope / out of scope

В scope входят групповая RSVP-форма, Apps Script API, один лист Google Sheet `Guests`, документация по деплою и мягкие ошибки при отсутствии приглашения.

Вне scope остаются Telegram-бот, Cloudflare Worker, PIN-код, аккаунты гостей, антиспам, audit log, создание гостей через сайт и полноценная авторизация.

## 4. Users and UX flows

Основной пользователь - приглашенный гость или представитель семьи/пары, который отвечает за всю группу.

Поток:
1. Гость открывает сайт с `?groupId=<uuid>`.
2. Сайт загружает гостей группы через Apps Script.
3. RSVP-блок показывает карточки гостей с фиксированными именами.
4. Гость выбирает присутствие для каждого человека.
5. Гость указывает номер телефона для каждого человека.
6. При `Нет` поля алкоголя и транспорта скрываются и очищаются.
7. При `Да` или `Пока не знаю` гость заполняет транспорт и алкоголь.
8. Если гость приглашен на второй день, карточка показывает дополнительный блок:
   присутствие на втором дне, ночевка и алкоголь второго дня.
9. Одна кнопка сохраняет ответы всех гостей группы.

Если `groupId` отсутствует или не найден, основная страница остается доступной, а RSVP-блок показывает сообщение с просьбой связаться с парой.

## 5. Architecture and components

- `index.html` - статическая свадебная страница и контейнер групповой RSVP-формы.
- `styles.css` - адаптивная стилизация страницы, статусов и карточек гостей.
- `script.js` - клиентская загрузка группы, валидация и сохранение.
- `apps-script/Code.js` - Google Apps Script Web App API для чтения и обновления Google Sheet.
- `apps-script/README.md` - инструкция по настройке таблицы и деплою Apps Script.

Сайт остается без npm, сборщика и frontend-библиотек.

## 6. Data models and schemas

Google Sheet содержит один лист `Guests`. Одна строка = один человек.

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

Значения в публичном API сайта остаются стабильными английскими кодами, но в Google Sheet сохраняются русские подписи:
- `phone`: номер телефона свободным текстом;
- `attendance`: `Да`, `Нет`, `Пока не знаю`;
- `transport`: `На трансфере`, `Своими силами`, пусто при `attendance = Нет`;
- `alcoholOptions`: значения через запятую, например `Коктейли, Шампанское, Вино`;
- `alcoholOther`: свободный текст из поля `Свой вариант` или пусто;
- `secondDayInvited`: `Да` для гостей, приглашенных на второй день, иначе пусто или `Нет`;
- `secondDayAttendance`: `Да`, `Нет`, `Пока не знаю`, пусто если гость не приглашен на второй день;
- `secondDayStayOvernight`: `Да`, `Нет`, `Пока не знаю`, пусто при `secondDayAttendance = Нет`;
- `secondDayAlcoholOptions`: значения через запятую, например `Пиво, Сидр, Вино`;
- `secondDayAlcoholOther`: свободный текст второго дня из поля `Свой вариант` или пусто;
- `updatedAt`: ISO timestamp последнего сохранения.

`groupId` и `personId` должны быть UUID. Гости заранее добавляются вручную в таблицу.

## 7. APIs and contracts

Apps Script деплоится как Web App:
- execute as: владелец скрипта;
- access: anyone;
- доступ к таблице остается внутри Apps Script.

Загрузка группы:

```text
GET <apps-script-url>?action=getGroup&groupId=<uuid>
```

Ответ:

```json
{
  "ok": true,
  "groupId": "uuid",
  "guests": [
    {
      "personId": "uuid",
      "firstName": "Алиса",
      "lastName": "Иванова",
      "phone": "+7 999 123-45-67",
      "attendance": "yes",
      "alcoholOptions": ["wine"],
      "alcoholOther": "",
      "transport": "transfer",
      "secondDayInvited": true,
      "secondDayAttendance": "yes",
      "secondDayStayOvernight": "unknown",
      "secondDayAlcoholOptions": ["beer", "cider"],
      "secondDayAlcoholOther": ""
    }
  ]
}
```

Сохранение:

```text
POST <apps-script-url>
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

Apps Script обновляет только существующие строки, где совпадают `groupId` и `personId`. Имена из write-запросов игнорируются.
Флаг `secondDayInvited` не обновляется с сайта: он заполняется вручную в `Guests`
и управляет видимостью второго дня.

## 8. Security, privacy, and compliance

- Google API токены и credentials запрещено хранить в публичном frontend-коде.
- `groupId` считается bearer-ссылкой: кто имеет ссылку, может видеть и менять ответы группы.
- Это приемлемо для свадебного RSVP, но не является полноценной авторизацией.
- Apps Script валидирует enum-значения и не создает новых гостей из публичного запроса.

## 9. Risks, tradeoffs, and mitigations

- Риск: прямой `fetch` в Apps Script может упереться в CORS-ограничения. Митигация: использовать Apps Script-friendly request format и при необходимости добавить Worker позже.
- Риск: ссылку с `groupId` можно переслать. Митигация: UUID неугадываемый; PIN и аккаунты гостей сознательно вынесены за scope.
- Риск: одновременное редактирование одной группы. Митигация: применяется правило “последняя запись победила”.

## 10. Test plan and acceptance criteria

- Без `groupId` RSVP показывает мягкую ошибку.
- С неизвестным `groupId` RSVP показывает мягкую ошибку.
- С валидным `groupId` отображаются все гости группы.
- Имя и фамилия не редактируются.
- Нельзя сохранить группу, если у любого гостя не выбран `attendance`.
- Нельзя сохранить группу, если у любого гостя не указан номер телефона.
- При `yes` или `unknown` обязательны транспорт и алкоголь/другое.
- При `no` детали скрываются и очищаются.
- Для гостей с `secondDayInvited = Да` нельзя сохранить без ответа о присутствии на втором дне.
- При `secondDayAttendance = yes` или `unknown` обязательны ночевка и алкоголь/другое второго дня.
- При `secondDayAttendance = no` детали второго дня скрываются и очищаются.
- Повторное открытие ссылки показывает данные из таблицы.
- Apps Script не создает гостей и не принимает изменения имени/фамилии.
- Mobile и desktop отображают группы из 1, 2 и 4 человек без горизонтального overflow.

## 11. Rollout, observability, and rollback

Rollout:
1. Создать Google Sheet с листом `Guests`.
2. Заполнить строки гостей и UUID.
3. Задеплоить Apps Script Web App.
4. Подставить `/exec` URL в `APPS_SCRIPT_URL`.
5. Опубликовать сайт через GitHub Pages.

Observability: ручная проверка таблицы, browser console и Apps Script executions.

Rollback: вернуть предыдущий commit сайта или очистить `APPS_SCRIPT_URL`, чтобы RSVP показывал мягкую ошибку.

## 12. Open questions

Открытых high-impact вопросов нет. Cloudflare Worker остается запасным вариантом, если прямой Apps Script endpoint окажется нестабилен в браузере.
