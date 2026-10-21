/**
 * ОБРОБНИК ЗАЯВОК САЙТУ АКАДЕМІЇ
 * Кожна заявка → новий рядок у Google Таблиці (окремий аркуш на тип заявки)
 * + миттєве сповіщення в Telegram і/або на пошту.
 *
 * Як встановити — див. README.md, розділ «Форми».
 */

// ===== НАЛАШТУВАННЯ =====
const TELEGRAM_BOT_TOKEN = "";   // токен бота від @BotFather, напр. "123456:ABC..."
const TELEGRAM_CHAT_ID   = "";   // id чату/групи, куди слати заявки
const NOTIFY_EMAIL       = "";   // пошта для копії заявок; порожньо — не слати

// Аркуші таблиці для різних типів заявок
const SHEETS = {
  course:   "Заявки на курси",
  corp:     "Корпоративні",
  robosumo: "Робосумо",
  dual:     "Дуальна освіта"
};

// Колонки в таблиці (порядок можна міняти)
const COLUMNS = [
  ["sentAt", "Дата"], ["name", "Ім'я"], ["phone", "Телефон"], ["email", "Email"], ["company", "Компанія"],
  ["role", "Хто"], ["org", "Організація"], ["position", "Посада / курс"],
  ["courseTitle", "Курс / тема"], ["formTitle", "Звідки заявка"], ["comment", "Коментар"],
  ["team", "Команда"], ["university", "Університет"], ["quiz", "Результат квізу"],
  ["utm_source", "utm_source"], ["utm_medium", "utm_medium"], ["utm_campaign", "utm_campaign"], ["utm_content", "utm_content"],
  ["page", "Сторінка"], ["status", "Статус"]
];
// ========================

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || "{}");

    // базовий захист від сміття
    if (d.website) return json_({ ok: true });
    const phoneOk = String(d.phone || "").replace(/\D/g, "").length >= 9;
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email || ""));
    if (!d.name || !(phoneOk || (d.type === "dual" && emailOk))) return json_({ ok: false, error: "name/contact" });

    d.sentAt = Utilities.formatDate(new Date(), "Europe/Kyiv", "yyyy-MM-dd HH:mm");
    d.status = "Нова";

    const sheet = sheet_(SHEETS[d.type] || SHEETS.course);
    sheet.appendRow(COLUMNS.map(([k]) => clean_(d[k])));

    notify_(d);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Перевірка в браузері: відкрийте адресу веб-застосунку — має бути {"ok":true,"alive":true}
function doGet() { return json_({ ok: true, alive: true }); }

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(COLUMNS.map(([, title]) => title));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#DDEFEC");
    const statusCol = COLUMNS.findIndex(([k]) => k === "status") + 1;
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(["Нова", "Передзвонили", "Записаний", "Оплатив", "Відмова"], true).build();
    sh.getRange(2, statusCol, 1000, 1).setDataValidation(rule);
  }
  return sh;
}

// Захист від формул у клітинках (=, +, -, @ на початку)
function clean_(v) {
  if (v === undefined || v === null) return "";
  v = String(v).slice(0, 2000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function notify_(d) {
  const lines = [
    "🆕 Заявка: " + (d.formTitle || d.courseTitle || ""),
    "👤 " + d.name + (d.company || d.org ? " (" + (d.company || d.org) + ")" : "") + (d.position ? ", " + d.position : ""),
    d.phone ? "📞 " + d.phone : "",
    d.email ? "✉️ " + d.email : "",
    d.team ? "🤖 Команда: " + d.team + (d.university ? ", " + d.university : "") : "",
    d.quiz ? "🧭 " + d.quiz : "",
    d.comment ? "💬 " + d.comment : "",
    d.utm_source ? "📈 " + [d.utm_source, d.utm_medium, d.utm_campaign].filter(String).join(" / ") : ""
  ].filter(String).join("\n");

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", {
        method: "post", contentType: "application/json", muteHttpExceptions: true,
        payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines, disable_web_page_preview: true })
      });
    } catch (err) { console.error("Telegram", err); }
  }
  if (NOTIFY_EMAIL) {
    try { MailApp.sendEmail(NOTIFY_EMAIL, "Заявка з сайту: " + (d.courseTitle || ""), lines); }
    catch (err) { console.error("Email", err); }
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Тест без сайту: у редакторі виберіть testPost і натисніть «Виконати»
function testPost() {
  const r = doPost({ postData: { contents: JSON.stringify({ type: "course", name: "Тест", phone: "+380000000000", courseTitle: "HCSA-CCTV", formTitle: "Перевірка" }) } });
  Logger.log(r.getContent());
}
