/* =====================================================================
   СПІЛЬНЕ ЯДРО САЙТУ: дані, форма заявки, фото/відео-переглядач.
   Тексти, курси, розклад тощо редагуються в адмінці (/admin),
   тут — лише логіка. Без потреби не чіпайте.
   ===================================================================== */
(function () {
  "use strict";

  const A = (window.A = {});
  const $ = (A.$ = (s, el = document) => el.querySelector(s));
  const esc = (A.esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  A.money = (n) => Number(n || 0).toLocaleString("uk-UA").replace(/ /g, " ");
  A.months = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];
  A.monthsFull = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const parseDate = (A.parseDate = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); });
  A.fmtRange = (a, b) => {
    const d1 = parseDate(a), M = A.months;
    if (!b || b === a) return `${d1.getDate()} ${M[d1.getMonth()]}`;
    const d2 = parseDate(b);
    return d1.getMonth() === d2.getMonth()
      ? `${d1.getDate()}–${d2.getDate()} ${M[d1.getMonth()]}`
      : `${d1.getDate()} ${M[d1.getMonth()]} – ${d2.getDate()} ${M[d2.getMonth()]}`;
  };
  A.arrow = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  A.check = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  A.play = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>';

  /* ---------- Ціна: 0 або порожньо — «Ціна за запитом» ---------- */
  A.priceHtml = (c) => Number(c.price) > 0
    ? `<div class="price">${A.money(c.price)} <small>грн</small></div>`
    : `<div class="price ask">Ціна за запитом</div>`;

  /* <img data-fb="текст">: якщо картинка не завантажилась — показати текст замість неї */
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fb === undefined || img.dataset.fbDone) return;
    img.dataset.fbDone = "1";
    const span = document.createElement("span");
    span.className = img.dataset.fbClass || "";
    span.textContent = img.dataset.fb;
    img.replaceWith(span);
  }, true);

  /* ---------- Розклад: місця й час ---------- */
  // Якщо кількість місць не вказана — «Реєстрація відкрита»
  A.seatsPill = (r) => {
    if (r.seats === "" || r.seats == null || r.seatsLeft === "" || r.seatsLeft == null) return `<span class="pill pill-teal">Реєстрація відкрита</span>`;
    const left = Number(r.seatsLeft), n = Number(r.seats) || 0;
    if (left <= 0) return `<span class="pill pill-amber">Місць немає</span>`;
    const low = left <= Math.max(3, Math.ceil(n * 0.3));
    return `<span class="pill ${low ? "pill-amber" : "pill-teal"}">${low ? "Лишилось " : "Вільно "}${left} з ${n}</span>`;
  };
  A.isFull = (r) => r.seatsLeft !== "" && r.seatsLeft != null && Number(r.seatsLeft) <= 0;
  A.dateCell = (r) => `${A.esc(A.fmtRange(r.date, r.end))}${r.time ? `<small class="t-time">з ${A.esc(r.time)}</small>` : ""}`;

  /* ---------- YouTube ---------- */
  A.ytId = (url) => {
    const m = String(url || "").match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : (/^[\w-]{11}$/.test(url || "") ? url : "");
  };
  A.ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  /* ---------- Завантаження даних з /content ---------- */
  A.load = async (names) => {
    const out = {};
    await Promise.all(names.map(async (n) => {
      const r = await fetch(`content/${n}.json`, { cache: "no-cache" });
      if (!r.ok) throw new Error(`content/${n}.json: ${r.status}`);
      const j = await r.json();
      out[n] = j.items !== undefined ? j.items : j;
    }));
    return out;
  };
  A.fail = (err) => {
    console.error(err);
    const box = document.createElement("div");
    box.className = "load-error";
    box.innerHTML = location.protocol === "file:"
      ? "Щоб переглянути сайт на комп'ютері, закрийте цю вкладку й запустіть файл <b>Open-site-Windows.bat</b> (або <b>Open-site-Mac.command</b> на Mac) з папки сайту. Подвійний клік по index.html не працює: браузер не дає сторінці читати файли з диска."
      : "Не вдалося завантажити дані сайту. Оновіть сторінку.";
    document.body.prepend(box);
  };

  /* ---------- Тексти з налаштувань: <el data-t="hero.subtitle"> ---------- */
  A.bind = (settings, root = document) => {
    root.querySelectorAll("[data-t]").forEach((el) => {
      const v = el.dataset.t.split(".").reduce((o, k) => (o == null ? o : o[k]), settings);
      if (v != null && v !== "") el.textContent = v;
    });
  };

  /* ---------- Шапка, футер ---------- */
  A.initChrome = (S) => {
    const nav = $("#nav"), btn = $("#menuBtn");
    if (nav && btn) {
      btn.addEventListener("click", () => btn.setAttribute("aria-expanded", nav.classList.toggle("open")));
      nav.addEventListener("click", (e) => { if (e.target.tagName === "A") { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
    }
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    const C = (S && S.contacts) || {}, links = [];
    if (C.phone) links.push(`<a href="tel:${esc(C.phone.replace(/[^\d+]/g, ""))}">${esc(C.phone)}</a>`);
    if (C.email) links.push(`<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`);
    if (C.telegram) links.push(`<a href="${esc(C.telegram)}" target="_blank" rel="noopener">Telegram</a>`);
    if (C.site) links.push(`<a href="${esc(C.site)}">${esc(C.site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a>`);
    const c = $("#contacts"); if (c) c.innerHTML = links.join("");
  };

  /* ---------- Поява при скролі ---------- */
  let io = null;
  A.reveal = (root = document) => {
    const els = root.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -60px 0px" });
    els.forEach((el) => io.observe(el));
  };

  /* ---------- Форма заявки ---------- */
  A.initForm = (D, opts = {}) => {
    const form = $("#signup"); if (!form) return { open() {} };
    const S = D.settings, select = $("#courseSelect"), msg = $("#formMsg"), submitBtn = $("#submitBtn"), titleEl = $("#formTitle");
    const courses = D.courses || [], soon = D.soon || [];
    const byId = (id) => courses.find((c) => c.id === id) || soon.find((c) => c.id === id);
    const options = [
      ...courses.map((c) => [c.id, c.title]),
      ...soon.map((c) => [c.id, `${c.title} (повідомити про старт)`]),
      ["online", "Дистанційне навчання (онлайн-група)"],
      ["corp", "Корпоративне навчання"],
      ["lab-visit", "Візит до лабораторії"],
      ["", "Ще не визначився"]
    ];
    select.innerHTML = options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
    if (opts.preselect) select.value = opts.preselect;

    const roboFields = form.querySelectorAll(".robo-field");
    const sync = () => roboFields.forEach((el) => { el.hidden = select.value !== "robosumo"; });
    select.addEventListener("change", sync); sync();

    function open(id, title) {
      if (id !== undefined && [...select.options].some((o) => o.value === id)) select.value = id;
      sync();
      titleEl.textContent = title || "Залишити заявку";
      msg.innerHTML = "";
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
    }

    // Будь-яка кнопка з data-signup / data-notify відкриває форму
    document.addEventListener("click", (e) => {
      const n = e.target.closest("[data-notify]");
      if (n) { const c = byId(n.dataset.notify); open(n.dataset.notify, `Повідомити про старт: ${c ? c.title : ""}`); return; }
      const s = e.target.closest("[data-signup]");
      if (!s) return;
      const id = s.dataset.signup;
      const special = {
        online: "Запис в онлайн-групу",
        corp: "Корпоративне навчання",
        "lab-visit": `Візит до лабораторії${s.dataset.lab ? ": " + s.dataset.lab : ""}`
      };
      const c = byId(id);
      const t = special[id] || (s.dataset.wait ? `Лист очікування: ${c ? c.title : ""}` : c ? `Запис на ${c.title}${s.dataset.date ? ", " + s.dataset.date : ""}` : "Залишити заявку");
      if (opts.beforeOpen) opts.beforeOpen();
      open(id, t);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.innerHTML = "";
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) return; // бот
      delete data.website;
      const name = form.elements.name, phone = form.elements.phone;
      const digits = (data.phone || "").replace(/\D/g, "");
      name.setAttribute("aria-invalid", !data.name.trim());
      phone.setAttribute("aria-invalid", digits.length < 9);
      if (!data.name.trim() || digits.length < 9) { msg.innerHTML = '<div class="form-msg err">Вкажіть ім\'я та номер телефону.</div>'; return; }

      data.type = data.course === "robosumo" || data.course === "robosumo-partner" ? "robosumo" : data.course === "corp" ? "corp" : "course";
      data.courseTitle = select.options[select.selectedIndex].text;
      data.formTitle = titleEl.textContent;
      data.page = location.href;
      data.sentAt = new Date().toISOString();
      const utm = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => { if (utm.get(k)) data[k] = utm.get(k); });

      if (!S.formEndpoint) {
        const body = Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
        location.href = `mailto:${S.contacts.email}?subject=${encodeURIComponent("Заявка: " + data.courseTitle)}&body=${encodeURIComponent(body)}`;
        return;
      }
      submitBtn.disabled = true; submitBtn.textContent = "Надсилаємо…";
      try {
        const res = await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
        const j = await res.json().catch(() => ({ ok: res.ok }));
        if (!j.ok) throw new Error(j.error || res.status);
        form.reset(); const q = $("#quizField"); if (q) q.value = ""; if (opts.preselect) select.value = opts.preselect; sync();
        msg.innerHTML = '<div class="form-msg ok">Дякуємо! Заявку отримали, передзвонимо протягом робочого дня.</div>';
        if (typeof gtag === "function") gtag("event", "generate_lead", { course: data.course });
        if (typeof fbq === "function") fbq("track", "Lead");
      } catch (err) {
        console.error(err);
        msg.innerHTML = `<div class="form-msg err">Не вдалося надіслати. Зателефонуйте нам: ${esc(S.contacts.phone)}</div>`;
      } finally {
        submitBtn.disabled = false; submitBtn.textContent = "Надіслати заявку";
      }
    });
    return { open };
  };

  /* ---------- Переглядач фото й відео на весь екран ---------- */
  let lb = null, lbList = [], lbIdx = 0, lbReturn = null;
  function lbRender() {
    const it = lbList[lbIdx], n = lbList.length;
    const media = it.video
      ? `<div class="lb-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(it.video)}?autoplay=1&rel=0" title="${esc(it.caption || "Відео")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<img src="${esc(it.src)}" alt="${esc(it.caption || "")}">`;
    lb.innerHTML = `
      <div class="lb-stage">${media}
        ${it.caption ? `<p class="lb-cap">${esc(it.caption)}${n > 1 ? ` <span>${lbIdx + 1} / ${n}</span>` : ""}</p>` : n > 1 ? `<p class="lb-cap"><span>${lbIdx + 1} / ${n}</span></p>` : ""}
      </div>
      <button type="button" class="lb-close" data-lb="close" aria-label="Закрити"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      ${n > 1 ? `<button type="button" class="lb-nav prev" data-lb="-1" aria-label="Попереднє"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
      <button type="button" class="lb-nav next" data-lb="1" aria-label="Наступне"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>` : ""}`;
  }
  A.lightbox = (list, idx = 0) => {
    if (!lb) {
      lb = document.createElement("div");
      lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Перегляд");
      document.body.appendChild(lb);
      lb.addEventListener("click", (e) => {
        const b = e.target.closest("[data-lb]");
        if (b) { b.dataset.lb === "close" ? A.closeLightbox() : step(Number(b.dataset.lb)); return; }
        if (e.target === lb || e.target.classList.contains("lb-stage")) A.closeLightbox();
      });
      document.addEventListener("keydown", (e) => {
        if (!lb || lb.hidden) return;
        if (e.key === "Escape") A.closeLightbox();
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      });
    }
    lbReturn = document.activeElement;
    lbList = list; lbIdx = idx; lbRender();
    lb.hidden = false; document.documentElement.classList.add("lb-open");
    lb.querySelector(".lb-close").focus();
  };
  function step(d) { if (lbList.length < 2) return; lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbRender(); lb.querySelector(".lb-close").focus(); }
  A.closeLightbox = () => {
    if (!lb || lb.hidden) return;
    lb.hidden = true; lb.innerHTML = ""; document.documentElement.classList.remove("lb-open");
    if (lbReturn && document.contains(lbReturn)) lbReturn.focus({ preventScroll: true });
  };

  /* ---------- Відео-картки (YouTube завантажується лише по кліку) ---------- */
  A.videoCards = (videos) => videos.map((v, i) => {
    const id = A.ytId(v.url); if (!id) return "";
    return `<button type="button" class="vcard reveal" data-video="${i}">
      <span class="vthumb"><img src="${A.ytThumb(id)}" alt="" loading="lazy"><span class="vplay">${A.play}</span></span>
      <span class="vtitle">${esc(v.title)}</span>${v.caption ? `<span class="vcap">${esc(v.caption)}</span>` : ""}
    </button>`;
  }).join("");
  A.bindVideoCards = (root, videos) => {
    const list = videos.map((v) => ({ video: A.ytId(v.url), caption: v.title })).filter((v) => v.video);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-video]"); if (!b) return;
      const v = videos[Number(b.dataset.video)];
      A.lightbox(list, list.findIndex((x) => x.video === A.ytId(v.url)));
    });
  };
})();
