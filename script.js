const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwjrWZeb8DtCy5Qlw9twiqTdeJ4nQ0kY8H0bvqtfYcETMsFoCnjR3AqBit7KGAFdWoJIQ/exec";

const RSVP_ERROR_MESSAGE =
  "Не удалось найти ваше приглашение. Пожалуйста, свяжитесь с нами, и мы поможем с анкетой.";

const form = document.querySelector("#rsvp-form");
const inviteState = document.querySelector("#invite-state");
const guestList = document.querySelector("#guest-list");
const statusNode = document.querySelector("#form-status");
const submitButton = document.querySelector("#submit-button");

const params = new URLSearchParams(window.location.search);
const groupId = params.get("groupId") || params.get("gid");
let guests = [];

const FIRST_DAY_ALCOHOL_CHOICES = [
  ["cocktails", "Коктейли"],
  ["champagne", "Шампанское"],
  ["wine", "Вино"],
  ["whiskey", "Виски"],
  ["rum", "Ром"],
  ["cognac", "Коньяк"],
  ["none", "Без алкоголя", true],
];

const SECOND_DAY_ALCOHOL_CHOICES = [
  ["beer", "Пиво"],
  ["cider", "Сидр"],
  ["vodka", "Водка"],
  ["wine", "Вино"],
  ["whiskey", "Виски"],
  ["rum", "Ром"],
  ["cognac", "Коньяк"],
  ["champagne", "Шампанское"],
  ["none", "Без алкоголя", true],
];

function setInviteState(message, type = "") {
  inviteState.textContent = message;
  inviteState.className = `invite-state${type ? ` is-${type}` : ""}`;
}

function setStatus(message, type = "") {
  statusNode.textContent = message;
  statusNode.className = `form-status${type ? ` is-${type}` : ""}`;
}

function getGuestField(guestId, selector) {
  return guestList.querySelector(`[data-guest-id="${guestId}"] ${selector}`);
}

function getCheckedValue(guestId, name) {
  const checked = getGuestField(guestId, `input[name="${name}-${guestId}"]:checked`);
  return checked ? checked.value : null;
}

function getAlcoholCheckboxes(guestId) {
  return [...guestList.querySelectorAll(`[data-guest-id="${guestId}"] input[data-alcohol]`)];
}

function getSecondDayAlcoholCheckboxes(guestId) {
  return [
    ...guestList.querySelectorAll(`[data-guest-id="${guestId}"] input[data-second-day-alcohol]`),
  ];
}

function isSecondDayInvited(guest) {
  return guest.secondDayInvited === true;
}

function setGuestDetailsVisibility(guestId) {
  const details = getGuestField(guestId, "[data-guest-details]");
  const transportRadios = [
    ...guestList.querySelectorAll(`[data-guest-id="${guestId}"] input[data-transport]`),
  ];
  const alcoholCheckboxes = getAlcoholCheckboxes(guestId);
  const otherInput = getGuestField(guestId, "[data-alcohol-other]");
  const alcoholError = getGuestField(guestId, "[data-alcohol-error]");
  const attendance = getCheckedValue(guestId, "attendance");
  const shouldHide = attendance === "no";
  const shouldRequireDetails = attendance === "yes" || attendance === "unknown";

  details.hidden = shouldHide;

  transportRadios.forEach((radio) => {
    radio.required = shouldRequireDetails;
    if (shouldHide) {
      radio.checked = false;
    }
  });

  if (shouldHide) {
    alcoholCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    otherInput.value = "";
    alcoholError.textContent = "";
  }
}

function setSecondDayDetailsVisibility(guestId) {
  const details = getGuestField(guestId, "[data-second-day-details]");

  if (!details) {
    return;
  }

  const stayRadios = [
    ...guestList.querySelectorAll(`[data-guest-id="${guestId}"] input[data-second-day-stay]`),
  ];
  const alcoholCheckboxes = getSecondDayAlcoholCheckboxes(guestId);
  const otherInput = getGuestField(guestId, "[data-second-day-alcohol-other]");
  const alcoholError = getGuestField(guestId, "[data-second-day-alcohol-error]");
  const attendance = getCheckedValue(guestId, "secondDayAttendance");
  const shouldHide = attendance === "no";
  const shouldRequireDetails = attendance === "yes" || attendance === "unknown";

  details.hidden = shouldHide;

  stayRadios.forEach((radio) => {
    radio.required = shouldRequireDetails;
    if (shouldHide) {
      radio.checked = false;
    }
  });

  if (shouldHide) {
    alcoholCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    otherInput.value = "";
    alcoholError.textContent = "";
  }
}

function validateAlcohol(guestId) {
  const attendance = getCheckedValue(guestId, "attendance");
  const alcoholError = getGuestField(guestId, "[data-alcohol-error]");

  if (attendance !== "yes" && attendance !== "unknown") {
    alcoholError.textContent = "";
    return true;
  }

  const hasAlcoholChoice = getAlcoholCheckboxes(guestId).some((checkbox) => checkbox.checked);
  const otherInput = getGuestField(guestId, "[data-alcohol-other]");
  const hasOtherChoice = otherInput.value.trim().length > 0;

  if (!hasAlcoholChoice && !hasOtherChoice) {
    alcoholError.textContent = "Выберите хотя бы один вариант или заполните поле «Свой вариант».";
    return false;
  }

  alcoholError.textContent = "";
  return true;
}

function validateSecondDayAlcohol(guestId) {
  const alcoholError = getGuestField(guestId, "[data-second-day-alcohol-error]");

  if (!alcoholError) {
    return true;
  }

  const attendance = getCheckedValue(guestId, "secondDayAttendance");

  if (attendance !== "yes" && attendance !== "unknown") {
    alcoholError.textContent = "";
    return true;
  }

  const hasAlcoholChoice = getSecondDayAlcoholCheckboxes(guestId).some(
    (checkbox) => checkbox.checked,
  );
  const otherInput = getGuestField(guestId, "[data-second-day-alcohol-other]");
  const hasOtherChoice = otherInput.value.trim().length > 0;

  if (!hasAlcoholChoice && !hasOtherChoice) {
    alcoholError.textContent = "Выберите хотя бы один вариант или заполните поле «Свой вариант».";
    return false;
  }

  alcoholError.textContent = "";
  return true;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options;
  }

  if (typeof options === "string") {
    return options
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
  }

  return [];
}

function renderGuestCard(guest, index) {
  const personId = escapeHtml(guest.personId);
  const firstName = escapeHtml(guest.firstName);
  const lastName = escapeHtml(guest.lastName);
  const attendance = guest.attendance || "";
  const transport = guest.transport || "";
  const alcoholOptions = normalizeOptions(guest.alcoholOptions);
  const alcoholOther = escapeHtml(guest.alcoholOther || "");
  const secondDayAlcoholOptions = normalizeOptions(guest.secondDayAlcoholOptions);
  const secondDayAlcoholOther = escapeHtml(guest.secondDayAlcoholOther || "");
  const fullName = `${firstName} ${lastName}`.trim();

  return `
    <article class="guest-card" data-guest-id="${personId}">
      <header class="guest-card__header">
        <span class="guest-card__eyebrow">Гость ${index + 1}</span>
        <h3>${fullName}</h3>
      </header>

      <fieldset class="form-group">
        <legend>Будете ли присутствовать?</legend>
        <label class="choice">
          <input type="radio" name="attendance-${personId}" value="yes" required ${
            attendance === "yes" ? "checked" : ""
          }>
          <span>Да</span>
        </label>
        <label class="choice">
          <input type="radio" name="attendance-${personId}" value="no" ${
            attendance === "no" ? "checked" : ""
          }>
          <span>Нет</span>
        </label>
        <label class="choice">
          <input type="radio" name="attendance-${personId}" value="unknown" ${
            attendance === "unknown" ? "checked" : ""
          }>
          <span>Пока не знаю</span>
        </label>
      </fieldset>

      <div class="conditional-fields" data-guest-details>
        <fieldset class="form-group">
          <legend>Предпочтения в алкоголе</legend>
          ${renderAlcoholChoices(personId, FIRST_DAY_ALCOHOL_CHOICES, alcoholOptions, "alcohol")}
          <label class="form-row form-row--compact">
            Свой вариант
            <input
              name="alcoholOther-${personId}"
              type="text"
              autocomplete="off"
              value="${alcoholOther}"
              data-alcohol-other
            >
          </label>
          <p class="field-error" data-alcohol-error aria-live="polite"></p>
        </fieldset>

        <fieldset class="form-group">
          <legend>Как планируете добираться?</legend>
          <label class="choice">
            <input type="radio" name="transport-${personId}" value="transfer" data-transport ${
              transport === "transfer" ? "checked" : ""
            }>
            <span>На трансфере</span>
          </label>
          <label class="choice">
            <input type="radio" name="transport-${personId}" value="self" data-transport ${
              transport === "self" ? "checked" : ""
            }>
            <span>Своими силами</span>
          </label>
        </fieldset>
      </div>

      ${
        isSecondDayInvited(guest)
          ? renderSecondDaySection(
              personId,
              guest.secondDayAttendance || "",
              guest.secondDayStayOvernight || "",
              secondDayAlcoholOptions,
              secondDayAlcoholOther,
            )
          : ""
      }
    </article>
  `;
}

function renderSecondDaySection(
  personId,
  attendance,
  stayOvernight,
  alcoholOptions,
  alcoholOther,
) {
  return `
    <section class="day-section day-section--second" data-second-day>
      <p class="day-section__title">Второй день</p>

      <fieldset class="form-group">
        <legend>Будете ли присутствовать?</legend>
        <label class="choice">
          <input type="radio" name="secondDayAttendance-${personId}" value="yes" required ${
            attendance === "yes" ? "checked" : ""
          }>
          <span>Да</span>
        </label>
        <label class="choice">
          <input type="radio" name="secondDayAttendance-${personId}" value="no" ${
            attendance === "no" ? "checked" : ""
          }>
          <span>Нет</span>
        </label>
        <label class="choice">
          <input type="radio" name="secondDayAttendance-${personId}" value="unknown" ${
            attendance === "unknown" ? "checked" : ""
          }>
          <span>Пока не знаю</span>
        </label>
      </fieldset>

      <div class="conditional-fields" data-second-day-details>
        <fieldset class="form-group">
          <legend>Планируете ли остаться на ночь в месте проведения?</legend>
          <label class="choice">
            <input type="radio" name="secondDayStayOvernight-${personId}" value="yes" data-second-day-stay ${
              stayOvernight === "yes" ? "checked" : ""
            }>
            <span>Да</span>
          </label>
          <label class="choice">
            <input type="radio" name="secondDayStayOvernight-${personId}" value="no" data-second-day-stay ${
              stayOvernight === "no" ? "checked" : ""
            }>
            <span>Нет</span>
          </label>
          <label class="choice">
            <input type="radio" name="secondDayStayOvernight-${personId}" value="unknown" data-second-day-stay ${
              stayOvernight === "unknown" ? "checked" : ""
            }>
            <span>Пока не знаю</span>
          </label>
        </fieldset>

        <fieldset class="form-group">
          <legend>Предпочтения в алкоголе</legend>
          ${renderAlcoholChoices(
            personId,
            SECOND_DAY_ALCOHOL_CHOICES,
            alcoholOptions,
            "second-day-alcohol",
          )}
          <label class="form-row form-row--compact">
            Свой вариант
            <input
              name="secondDayAlcoholOther-${personId}"
              type="text"
              autocomplete="off"
              value="${alcoholOther}"
              data-second-day-alcohol-other
            >
          </label>
          <p class="field-error" data-second-day-alcohol-error aria-live="polite"></p>
        </fieldset>
      </div>
    </section>
  `;
}

function renderAlcoholChoices(guestId, choices, selectedValues, dataAttribute) {
  return choices
    .map(([value, label, isExclusive]) =>
      renderAlcoholChoice(guestId, value, label, selectedValues, dataAttribute, isExclusive),
    )
    .join("");
}

function renderAlcoholChoice(
  guestId,
  value,
  label,
  selectedValues,
  dataAttribute,
  isExclusive = false,
) {
  return `
    <label class="choice">
      <input
        type="checkbox"
        name="${dataAttribute}-${guestId}"
        value="${value}"
        data-${dataAttribute}
        ${isExclusive ? "data-exclusive" : ""}
        ${selectedValues.includes(value) ? "checked" : ""}
      >
      <span>${label}</span>
    </label>
  `;
}

function renderGuests(nextGuests) {
  guests = nextGuests;
  guestList.innerHTML = guests.map(renderGuestCard).join("");

  guests.forEach((guest) => {
    setGuestDetailsVisibility(guest.personId);
    validateAlcohol(guest.personId);
    setSecondDayDetailsVisibility(guest.personId);
    validateSecondDayAlcohol(guest.personId);
  });

  submitButton.hidden = false;
}

function buildPayload() {
  return {
    action: "saveGroup",
    groupId,
    guests: guests.map((guest) => {
      const attendance = getCheckedValue(guest.personId, "attendance");
      const payload = {
        personId: guest.personId,
        attendance,
        alcoholOptions: [],
        alcoholOther: "",
        transport: "",
      };

      if (attendance !== "no") {
        payload.alcoholOptions = getAlcoholCheckboxes(guest.personId)
          .filter((checkbox) => checkbox.checked)
          .map((checkbox) => checkbox.value);
        payload.alcoholOther = getGuestField(guest.personId, "[data-alcohol-other]").value.trim();
        payload.transport = getCheckedValue(guest.personId, "transport") || "";
      }

      if (isSecondDayInvited(guest)) {
        const secondDayAttendance = getCheckedValue(guest.personId, "secondDayAttendance");
        payload.secondDayAttendance = secondDayAttendance;
        payload.secondDayStayOvernight = "";
        payload.secondDayAlcoholOptions = [];
        payload.secondDayAlcoholOther = "";

        if (secondDayAttendance !== "no") {
          payload.secondDayStayOvernight =
            getCheckedValue(guest.personId, "secondDayStayOvernight") || "";
          payload.secondDayAlcoholOptions = getSecondDayAlcoholCheckboxes(guest.personId)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value);
          payload.secondDayAlcoholOther = getGuestField(
            guest.personId,
            "[data-second-day-alcohol-other]",
          ).value.trim();
        }
      }

      return payload;
    }),
  };
}

function validateGroup() {
  let isValid = form.reportValidity();

  guests.forEach((guest) => {
    setGuestDetailsVisibility(guest.personId);
    setSecondDayDetailsVisibility(guest.personId);

    if (!validateAlcohol(guest.personId)) {
      isValid = false;
    }

    if (!validateSecondDayAlcohol(guest.personId)) {
      isValid = false;
    }
  });

  return isValid;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function loadGroup() {
  if (!groupId || !APPS_SCRIPT_URL) {
    setInviteState(RSVP_ERROR_MESSAGE, "error");
    return;
  }

  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", "getGroup");
  url.searchParams.set("groupId", groupId);

  try {
    const data = await requestJson(url.toString());

    if (!Array.isArray(data.guests) || data.guests.length === 0) {
      setInviteState(RSVP_ERROR_MESSAGE, "error");
      return;
    }

    renderGuests(data.guests);
    setInviteState("Приглашение найдено. Ответы можно обновить в любой момент.", "success");
  } catch (error) {
    console.error("Failed to load RSVP group:", error);
    setInviteState(RSVP_ERROR_MESSAGE, "error");
  }
}

guestList.addEventListener("change", (event) => {
  const card = event.target.closest("[data-guest-id]");

  if (!card) {
    return;
  }

  const guestId = card.dataset.guestId;

  if (event.target.name === `attendance-${guestId}`) {
    setGuestDetailsVisibility(guestId);
    validateAlcohol(guestId);
  }

  if (event.target.name === `secondDayAttendance-${guestId}`) {
    setSecondDayDetailsVisibility(guestId);
    validateSecondDayAlcohol(guestId);
  }

  if (event.target.matches("[data-alcohol]")) {
    const alcoholCheckboxes = getAlcoholCheckboxes(guestId);
    const noAlcoholCheckbox = alcoholCheckboxes.find((checkbox) => checkbox.value === "none");

    if (event.target === noAlcoholCheckbox && noAlcoholCheckbox.checked) {
      alcoholCheckboxes
        .filter((checkbox) => checkbox !== noAlcoholCheckbox)
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
    }

    if (event.target !== noAlcoholCheckbox && event.target.checked) {
      noAlcoholCheckbox.checked = false;
    }

    validateAlcohol(guestId);
  }

  if (event.target.matches("[data-second-day-alcohol]")) {
    const alcoholCheckboxes = getSecondDayAlcoholCheckboxes(guestId);
    const noAlcoholCheckbox = alcoholCheckboxes.find((checkbox) => checkbox.value === "none");

    if (event.target === noAlcoholCheckbox && noAlcoholCheckbox.checked) {
      alcoholCheckboxes
        .filter((checkbox) => checkbox !== noAlcoholCheckbox)
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
    }

    if (event.target !== noAlcoholCheckbox && event.target.checked) {
      noAlcoholCheckbox.checked = false;
    }

    validateSecondDayAlcohol(guestId);
  }
});

guestList.addEventListener("input", (event) => {
  const isFirstDayOther = event.target.matches("[data-alcohol-other]");
  const isSecondDayOther = event.target.matches("[data-second-day-alcohol-other]");

  if (!isFirstDayOther && !isSecondDayOther) {
    return;
  }

  const card = event.target.closest("[data-guest-id]");
  const guestId = card.dataset.guestId;
  const alcoholCheckboxes = isFirstDayOther
    ? getAlcoholCheckboxes(guestId)
    : getSecondDayAlcoholCheckboxes(guestId);
  const noAlcoholCheckbox = alcoholCheckboxes.find((checkbox) => checkbox.value === "none");

  if (event.target.value.trim() && noAlcoholCheckbox) {
    noAlcoholCheckbox.checked = false;
  }

  if (isFirstDayOther) {
    validateAlcohol(guestId);
  } else {
    validateSecondDayAlcohol(guestId);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  if (!guests.length) {
    setInviteState(RSVP_ERROR_MESSAGE, "error");
    return;
  }

  if (!validateGroup()) {
    setStatus("Проверьте обязательные поля у каждого гостя.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Сохраняем...";
  setStatus("Сохраняем ответы...");

  try {
    await requestJson(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(buildPayload()),
    });

    setStatus("Спасибо! Ответы сохранены.", "success");
  } catch (error) {
    console.error("Failed to save RSVP group:", error);
    setStatus("Не удалось сохранить ответы. Пожалуйста, попробуйте еще раз.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Сохранить ответы";
  }
});

loadGroup();
