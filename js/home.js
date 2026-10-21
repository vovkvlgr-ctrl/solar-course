/* Головна сторінка. Дані приходять з /content (редагуються в адмінці). */
(async function () {
  "use strict";
  const { $, esc } = A;
  let D;
  try {
    D = await A.load(["settings", "courses", "soon", "schedule", "labs", "free", "videos", "gallery", "reviews", "faq", "partners"]);
  } catch (e) { A.fail(e); return; }

  const S = D.settings, COURSES = D.courses, SOON = D.soon;
  const courseById = (id) => COURSES.find((c) => c.id === id);
  const soonById = (id) => SOON.find((c) => c.id === id);
  const courseUrl = (id) => `course.html?id=${encodeURIComponent(id)}`;

  A.bind(S);
  A.initChrome(S);

  /* ---------- Hero ---------- */
  $("#heroTitle").innerHTML = `${esc(S.hero.title)} <span>${esc(S.hero.titleAccent)}</span>`;
  // Число (150+, 8, 95%) — великим шрифтом; слово (Онлайн) — меншим, щоб влазило в картку
  $("#heroStats").innerHTML = (S.hero.stats || []).map((s) => `<div class="stat"><b class="${/^[\d\s+%.,–-]+$/.test(String(s.value)) ? "num" : "word"}">${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("");

  /* ---------- Курси (групуються за напрямом) ---------- */
  const card = (c) => `
    <article class="course${c.featured ? " featured" : ""}${c.soon ? " is-soon" : ""} reveal">
      <div class="course-top"><span class="vendor">${esc(c.vendor)}</span>${c.badge ? `<span class="pill ${c.soon ? "pill-amber" : "pill-hot"}">${esc(c.badge)}</span>` : ""}</div>
      <h3><a class="course-link" href="${courseUrl(c.id)}">${esc(c.title)}</a></h3>
      <p>${esc(c.text)}</p>
      <div class="tags">${(c.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      <div class="course-foot">
        ${A.priceHtml(c)}
        <a class="btn ${c.soon ? "btn-dark" : "btn-primary"}" href="${courseUrl(c.id)}">Детальніше ${A.arrow}</a>
      </div>
    </article>`;
  const directions = [...new Set(COURSES.map((c) => c.direction || "").filter(Boolean))];
  const newDirs = S.newDirections || ["Енергетика"];
  // Одна суцільна сітка (без пустот), напрями — кнопки-фільтри
  $("#coursesList").outerHTML = `
    ${directions.length > 1 ? `<div class="filters dir-filters" id="dirFilters" role="group" aria-label="Напрям">
      <button class="chip" type="button" data-dir="" aria-pressed="true">Усі напрями</button>
      ${directions.map((d) => `<button class="chip" type="button" data-dir="${esc(d)}" aria-pressed="false">${esc(d)}${newDirs.includes(d) ? ' <span class="pill pill-hot">новий</span>' : ""}</button>`).join("")}
    </div>` : ""}
    <div class="course-flex" id="coursesList">${COURSES.map((c) => card(c).replace('<article class="course', `<article data-dir="${esc(c.direction || "")}" class="course`)).join("")}</div>`;
  const dirBox = $("#dirFilters");
  if (dirBox) dirBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dir]"); if (!b) return;
    dirBox.querySelectorAll("[data-dir]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    const d = b.dataset.dir, list = $("#coursesList");
    list.classList.toggle("filtered", !!d);
    list.querySelectorAll(".course").forEach((el) => { el.hidden = !!d && el.dataset.dir !== d; });
  });

  if (SOON.length) $("#soonList").insertAdjacentHTML("beforebegin", '<div class="dir-head"><h3>Готуємо до запуску</h3></div>');
  $("#soonList").innerHTML = SOON.map((c) => `
    <div class="soon reveal">
      <div class="course-top"><b>${esc(c.title)}</b><span class="pill pill-amber">Скоро</span></div>
      <p>${esc(c.text)}</p>
      <button class="link-btn" type="button" data-notify="${esc(c.id)}">Повідомити про старт →</button>
    </div>`).join("");

  /* ---------- Онлайн ---------- */
  const O = S.online || {};
  if (O.url) $("#kwigaAll").href = O.url;
  $("#kwigaCats").innerHTML = (O.categories || []).map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>`).join("");
  const dev = (O.inDev || []).slice(0, 3);
  $("#inDevList").innerHTML = dev.map((d, i) => `
    <div class="dev reveal"><b>${esc(d.title)}</b>${d.text ? `<p>${esc(d.text)}</p>` : ""}
      <button type="button" class="link-btn" data-dev="${i}">Повідомити →</button></div>`).join("");
  if (!dev.length) { $("#inDevHead").hidden = true; $("#inDevList").hidden = true; }

  /* ---------- Безкоштовні ---------- */
  // показуємо перші 3 (порядок — як в адмінці)
  $("#freeList").innerHTML = D.free.slice(0, 3).map((f) => {
    const inner = `<span class="vendor">${esc(f.tag)}</span><span class="t">${esc(f.title)}</span><span class="d">${esc(f.text)}</span><span class="go">${f.url ? "Почати →" : "Незабаром"}</span>`;
    return f.url
      ? `<a class="free reveal" href="${esc(f.url)}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="free disabled reveal">${inner}</div>`;
  }).join("");

  /* ---------- Відео ---------- */
  const vids = (D.videos || []).filter((v) => A.ytId(v.url));
  if (vids.length) {
    const box = $("#videosList");
    box.innerHTML = A.videoCards(vids);
    A.bindVideoCards(box, vids);
  } else $("#videos").hidden = true;

  /* ---------- Фотогалерея ---------- */
  const photos = (D.gallery || []).filter((g) => g.image);
  if (photos.length) {
    const g = $("#galleryList");
    g.innerHTML = photos.map((p, i) => `<button type="button" class="gitem reveal" data-photo="${i}"><img src="${esc(p.image)}" alt="${esc(p.caption || "")}" loading="lazy">${p.caption ? `<span>${esc(p.caption)}</span>` : ""}</button>`).join("");
    g.addEventListener("click", (e) => {
      const b = e.target.closest("[data-photo]"); if (!b) return;
      A.lightbox(photos.map((p) => ({ src: p.image, caption: p.caption })), Number(b.dataset.photo));
    });
  } else $("#gallery").hidden = true;

  /* ---------- Університети-партнери (у блоці лабораторій) ---------- */
  const partners = D.partners || [];
  if (partners.length) {
    $("#partnersList").innerHTML = partners.map((p) => {
      const label = p.short || p.name;
      const logo = p.logo
        ? `<img src="${esc(p.logo)}" alt="${esc(p.name)}" loading="lazy" data-fb="${esc(label)}" data-fb-class="logo-txt">`
        : `<span class="logo-txt">${esc(label)}</span>`;
      const lab = p.lab && (D.labs || []).some((l) => l.id === p.lab) ? `<span class="lab-dot">Лабораторія</span>` : "";
      const tag = p.url ? "a" : "div";
      return `<${tag} class="logo-card reveal"${p.url ? ` href="${esc(p.url)}" target="_blank" rel="noopener"` : ""} title="${esc(p.name)}">${logo}${lab}</${tag}>`;
    }).join("");
  } else $("#partners").hidden = true;

  /* ---------- Відгуки ---------- */
  $("#reviewsList").innerHTML = (D.reviews || []).map((r) => `
    <figure class="review reveal">
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption>${r.photo ? `<img class="avatar" src="${esc(r.photo)}" alt="" loading="lazy">` : '<span class="avatar"></span>'}<span><b>${esc(r.name)}</b><small>${esc([r.role, r.course].filter(Boolean).join(" · "))}</small></span></figcaption>
    </figure>`).join("");

  /* ---------- FAQ ---------- */
  $("#faqList").innerHTML = (D.faq || []).map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");

  /* ---------- Календар ---------- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = (D.schedule || [])
    .filter((r) => r.date && A.parseDate(r.end || r.date) >= today)
    .sort((a, b) => A.parseDate(a.date) - A.parseDate(b.date));
  let activeFilter = "all";
  const hasOnline = upcoming.some((r) => r.format === "online");
  const filterIds = ["all", ...(hasOnline ? ["online"] : []), ...new Set(upcoming.map((r) => r.course))];
  const filtersEl = $("#filters");
  const matches = (r) => activeFilter === "all" || (activeFilter === "online" ? r.format === "online" : r.course === activeFilter);
  const titleOf = (id) => (courseById(id) || soonById(id) || { title: id }).title;

  function renderFilters() {
    filtersEl.innerHTML = filterIds.map((id) => {
      const label = id === "all" ? "Усі курси" : id === "online" ? "Онлайн" : titleOf(id);
      return `<button class="chip" type="button" data-chip="${esc(id)}" aria-pressed="${id === activeFilter}">${esc(label)}</button>`;
    }).join("");
  }
  A.scheduleRow = (r, withCourse = true) => {
    const seats = A.seatsPill(r), full = A.isFull(r);
    const action = full
      ? `<button class="link-btn" type="button" data-signup="${esc(r.course)}" data-wait="1">У лист очікування</button>`
      : `<button class="link-btn" type="button" data-signup="${esc(r.course)}" data-date="${esc(A.fmtRange(r.date, r.end))}${r.format === "online" ? ", онлайн" : ""}">Записатися</button>`;
    const place = r.format === "online" ? `<span class="pill pill-teal">Онлайн</span> з будь-якого міста` : `${esc(r.city || "")}${r.venue ? ", " + esc(r.venue) : ""}`;
    const c = courseById(r.course);
    const cell = c ? `<a href="${courseUrl(c.id)}">${esc(c.title)}</a>` : esc(titleOf(r.course));
    return `<tr><td class="strong">${A.dateCell(r)}</td>${withCourse ? `<td class="strong">${cell}</td>` : ""}<td class="muted">${place}</td><td class="muted">${esc(r.trainer)}</td><td>${seats}</td><td class="act">${action}</td></tr>`;
  };
  function renderSchedule() {
    const rows = upcoming.filter(matches);
    $("#scheduleBody").innerHTML = rows.length ? rows.map((r) => A.scheduleRow(r)).join("")
      : `<tr><td colspan="6" class="empty">Найближчих груп поки немає. <button class="link-btn" type="button" data-signup="${esc(activeFilter === "all" ? "" : activeFilter)}">Залиште заявку</button>, і ми повідомимо про старт.</td></tr>`;
  }
  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-chip]"); if (!b) return;
    activeFilter = b.dataset.chip; renderFilters(); renderSchedule();
  });
  document.addEventListener("click", (e) => {
    const f = e.target.closest("[data-filter]"); if (!f) return;
    activeFilter = filterIds.includes(f.dataset.filter) ? f.dataset.filter : "all"; renderFilters(); renderSchedule();
  });
  renderFilters(); renderSchedule();

  if (upcoming.length) {
    const n = upcoming[0], d = A.parseDate(n.date);
    $("#heroBadge").textContent = `Найближча група ${titleOf(n.course)}: ${d.getDate()} ${A.monthsFull[d.getMonth()]}`;
    $("#finalTitle").textContent = `Наступна група стартує ${d.getDate()} ${A.monthsFull[d.getMonth()]}`;
  }

  /* ---------- Лабораторії: карта ---------- */
  const LABS = D.labs || [];
  const mapWrap = $("#mapWrap"), pinsEl = $("#mapPins"), pop = $("#labPop");
  const VB = { x: -8, y: -8, w: 1220, h: 824 }, COS = Math.cos(48.5 * Math.PI / 180);
  const toPct = (lat, lon) => ({ x: (((lon - 22) * 100 * COS) - VB.x) / VB.w * 100, y: (((52.45 - lat) * 100) - VB.y) / VB.h * 100 });
  const pinIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

  const placed = LABS.filter((l) => isFinite(l.lat) && isFinite(l.lon)).map((l) => ({ lab: l, ...toPct(Number(l.lat), Number(l.lon)) }));
  const groups = [];
  placed.forEach((p) => {
    const g = groups.find((gr) => Math.hypot(gr[0].x - p.x, (gr[0].y - p.y) * VB.h / VB.w) < 2.6);
    g ? g.push(p) : groups.push([p]);
  });
  groups.forEach((g) => g.forEach((p, i) => { p.x = g[0].x; p.dx = (i - (g.length - 1) / 2) * 46; p.y = g[0].y; p.showLabel = i === Math.floor((g.length - 1) / 2); }));

  pinsEl.innerHTML = placed.map((p) => `
    <button type="button" class="pin${p.lab.soon ? " soon" : ""}" style="left:calc(${p.x.toFixed(2)}% + ${p.dx}px);top:${p.y.toFixed(2)}%"
      data-lab="${esc(p.lab.id)}" aria-expanded="false" aria-controls="labPop"
      aria-label="${esc(p.lab.title)}, ${esc(p.lab.city)}${p.lab.soon ? " (скоро)" : ""}"><span></span>${p.showLabel ? `<em class="pin-label">${esc(p.lab.city)}</em>` : ""}</button>`).join("");
  $("#labChips").innerHTML = LABS.map((l) => `<button type="button" class="chip${l.soon ? " is-soon" : ""}" data-lab="${esc(l.id)}"><i></i>${esc(l.title)}, ${esc(l.city)}</button>`).join("");

  let openLab = null, gIdx = 0, lastTrigger = null;
  const chevron = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

  function renderPop() {
    const l = openLab, ph = l.photos || [], n = ph.length, vid = A.ytId(l.video);
    const img = n
      ? `<button type="button" class="gal-open" data-galfull aria-label="Відкрити фото на весь екран"><img src="${esc(ph[gIdx])}" alt="${esc(l.title)}, фото ${gIdx + 1} з ${n}" loading="lazy"></button>`
      : `<div class="ph">Фото лабораторії з'являться тут.<br>Додайте їх в адмінці: Лабораторії → Фото.</div>`;
    pop.innerHTML = `
      <div class="gallery">
        ${img}
        ${l.soon ? '<span class="pill pill-hot">Скоро</span>' : ""}
        ${n > 1 ? `<button type="button" class="gal-btn prev" data-gal="-1" aria-label="Попереднє фото">${chevron("M15 6l-6 6 6 6")}</button>
          <button type="button" class="gal-btn next" data-gal="1" aria-label="Наступне фото">${chevron("M9 6l6 6-6 6")}</button>
          <div class="dots">${ph.map((_, i) => `<i class="${i === gIdx ? "on" : ""}"></i>`).join("")}</div>` : ""}
        ${vid ? `<button type="button" class="gal-video" data-labvideo>${A.play}<span>Відео</span></button>` : ""}
      </div>
      <button type="button" class="pop-close" data-close aria-label="Закрити"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="pop-body">
        <h3 id="labPopTitle" tabindex="-1">${esc(l.title)}</h3>
        <div class="addr">${pinIcon}<span>${esc(l.address)}</span></div>
        <p>${esc(l.text)}</p>
        ${(l.zones || []).length ? `<h4>Що в лабораторії</h4><ul>${l.zones.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>` : ""}
        <div class="tags">${(l.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <button type="button" class="btn btn-primary" data-signup="lab-visit" data-lab="${esc(l.title)}">${l.soon ? "Повідомити про відкриття" : "Прийти в лабораторію"}</button>
      </div>`;
  }
  function positionPop(pinBtn) {
    if (!pinBtn || window.matchMedia("(max-width:760px)").matches) { pop.style.left = ""; pop.style.top = ""; return; }
    const w = mapWrap.getBoundingClientRect(), b = pinBtn.getBoundingClientRect();
    const px = b.left + b.width / 2 - w.left, py = b.top + b.height / 2 - w.top;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = px > w.width / 2 ? px - pw - 28 : px + 28;
    left = Math.max(12, Math.min(left, w.width - pw - 12));
    let top = Math.max(12, Math.min(py - ph / 2, w.height - ph - 12));
    if (ph > w.height - 24) top = 12;
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  const pinFor = (id) => pinsEl.querySelector(`.pin[data-lab="${CSS.escape(id)}"]`);
  function openLabById(id, trigger) {
    openLab = LABS.find((l) => l.id === id); if (!openLab) return;
    gIdx = 0; lastTrigger = trigger;
    renderPop(); pop.hidden = false;
    pinsEl.querySelectorAll(".pin").forEach((p) => p.setAttribute("aria-expanded", p.dataset.lab === id));
    positionPop(pinFor(id));
    if (trigger && !trigger.classList.contains("pin")) mapWrap.scrollIntoView({ behavior: "smooth", block: "center" });
    $("#labPopTitle").focus({ preventScroll: true });
  }
  function closeLab() {
    if (!openLab) return;
    openLab = null; pop.hidden = true;
    pinsEl.querySelectorAll(".pin").forEach((p) => p.setAttribute("aria-expanded", "false"));
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest(".lightbox")) return;
    const t = e.target.closest("[data-lab]");
    if (t && !t.hasAttribute("data-signup")) {
      e.stopPropagation();
      openLab && openLab.id === t.dataset.lab ? closeLab() : openLabById(t.dataset.lab, t);
      return;
    }
    if (!openLab) return;
    if (e.target.closest("[data-close]")) { closeLab(); return; }
    const g = e.target.closest("[data-gal]");
    if (g) { const n = openLab.photos.length; gIdx = (gIdx + Number(g.dataset.gal) + n) % n; renderPop(); return; }
    if (e.target.closest("[data-galfull]")) { A.lightbox(openLab.photos.map((src) => ({ src, caption: openLab.title })), gIdx); return; }
    if (e.target.closest("[data-labvideo]")) { A.lightbox([{ video: A.ytId(openLab.video), caption: openLab.title }]); return; }
    if (!pop.contains(e.target)) closeLab();
  });
  document.addEventListener("keydown", (e) => {
    if (!openLab || document.documentElement.classList.contains("lb-open")) return;
    if (e.key === "Escape") closeLab();
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && pop.contains(document.activeElement) && openLab.photos.length > 1) {
      const n = openLab.photos.length; gIdx = (gIdx + (e.key === "ArrowRight" ? 1 : -1) + n) % n; renderPop(); $("#labPopTitle").focus();
    }
  });
  window.addEventListener("resize", () => { if (openLab) positionPop(pinFor(openLab.id)); });

  /* ---------- Робосумо ---------- */
  (function () {
    const R = S.robosumo || {};
    if (!R.date) return;
    const iso = String(R.date).slice(0, 16);
    const m = Number(iso.slice(5, 7));
    const target = new Date(iso + ":00" + (m >= 4 && m <= 10 ? "+03:00" : "+02:00"));
    const d = A.parseDate(iso);
    $("#roboDate").textContent = `${d.getDate()} ${A.monthsFull[d.getMonth()]}${iso.length > 10 ? ", " + iso.slice(11, 16) : ""} · ${R.place || ""}`;
    const rules = $("#roboRules");
    if (R.rulesUrl) rules.href = R.rulesUrl; else rules.hidden = true;
    const cells = {}; document.querySelectorAll("[data-cd]").forEach((el) => { cells[el.dataset.cd] = el; });
    const pad = (v) => String(v).padStart(2, "0");
    (function tick() {
      let s = Math.floor((target - Date.now()) / 1000);
      if (isNaN(s)) return;
      if (s <= 0) { $("#roboCd").innerHTML = '<div style="grid-column:1/-1"><b>Конкурс стартував!</b></div>'; return; }
      cells.d.textContent = Math.floor(s / 86400); s %= 86400;
      cells.h.textContent = pad(Math.floor(s / 3600)); s %= 3600;
      cells.m.textContent = pad(Math.floor(s / 60));
      cells.s.textContent = pad(s % 60);
      setTimeout(tick, 1000);
    })();
  })();

  /* ---------- Дуальна освіта ---------- */
  (function () {
    const DU = S.dual;
    if (!DU) { $("#dual").hidden = true; return; }
    $("#dualPoints").innerHTML = (DU.points || []).map((p) => `<li>${A.check}<span>${esc(p)}</span></li>`).join("");
    $("#dualAudiences").innerHTML = (DU.audiences || []).map((a) => `
      <div class="aud reveal"><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>
        <button type="button" class="link-btn" data-dual-role="${esc(a.role || "")}">Обговорити співпрацю →</button></div>`).join("");

    const form = $("#dualForm"), msg = $("#dualMsg"), btn = $("#dualSubmit");
    const labels = {
      university: ["Заклад освіти", "Посада / кафедра"],
      company: ["Компанія", "Посада"],
      student: ["Університет, курс", "Спеціальність"]
    };
    const sync = () => {
      const r = form.querySelector("input[name=role]:checked").dataset.role;
      $("#dualOrgLabel").textContent = labels[r][0];
      $("#dualPosLabel").textContent = labels[r][1];
    };
    form.addEventListener("change", (e) => { if (e.target.name === "role") sync(); });
    sync();

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dual-role]"); if (!b) return;
      const r = form.querySelector(`input[data-role="${CSS.escape(b.dataset.dualRole)}"]`);
      if (r) { r.checked = true; sync(); }
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => form.elements.org.focus({ preventScroll: true }), 500);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.innerHTML = "";
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) return;
      delete data.website;
      const digits = (data.phone || "").replace(/\D/g, "");
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || "");
      form.elements.name.setAttribute("aria-invalid", !data.name.trim());
      const contactOk = digits.length >= 9 || emailOk;
      form.elements.phone.setAttribute("aria-invalid", !contactOk);
      form.elements.email.setAttribute("aria-invalid", !contactOk);
      if (!data.name.trim() || !contactOk) { msg.innerHTML = '<div class="form-msg err">Вкажіть ім\'я та телефон або email.</div>'; return; }

      Object.assign(data, {
        type: "dual",
        courseTitle: "Дуальна освіта: " + data.role,
        formTitle: "Дуальна освіта",
        page: location.href,
        sentAt: new Date().toISOString()
      });
      const utm = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => { if (utm.get(k)) data[k] = utm.get(k); });

      if (!S.formEndpoint) {
        const body = Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
        location.href = `mailto:${S.contacts.email}?subject=${encodeURIComponent("Дуальна освіта: " + (data.org || data.name))}&body=${encodeURIComponent(body)}`;
        return;
      }
      btn.disabled = true; btn.textContent = "Надсилаємо…";
      try {
        const res = await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
        const j = await res.json().catch(() => ({ ok: res.ok }));
        if (!j.ok) throw new Error(j.error || res.status);
        form.reset(); sync();
        msg.innerHTML = '<div class="form-msg ok">Дякуємо! Ми зв\'яжемося з вами протягом двох робочих днів.</div>';
        if (typeof gtag === "function") gtag("event", "generate_lead", { course: "dual" });
        if (typeof fbq === "function") fbq("track", "Lead");
      } catch (err) {
        console.error(err);
        msg.innerHTML = `<div class="form-msg err">Не вдалося надіслати. Напишіть нам: ${esc(S.contacts.email)}</div>`;
      } finally {
        btn.disabled = false; btn.textContent = "Надіслати";
      }
    });
  })();

  /* ---------- Форма ---------- */
  const FORM = A.initForm(D, { beforeOpen: closeLab });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dev]"); if (!b) return;
    const d = (O.inDev || [])[Number(b.dataset.dev)];
    FORM.open("online", `Повідомити про старт онлайн-курсу: ${d ? d.title : ""}`);
  });

  /* ---------- Квіз (питання в js/quiz.js) ---------- */
  (function () {
    const box = $("#quizBox");
    if (typeof QUIZ === "undefined") { $("#quiz").hidden = true; return; }
    let step = 0;
    const answers = new Array(QUIZ.length).fill(null);
    function renderQuestion() {
      const item = QUIZ[step], pct = Math.round(((step + 1) / QUIZ.length) * 100);
      box.innerHTML = `
        <div class="quiz-meta"><span>Питання ${step + 1} з ${QUIZ.length}</span><span>~2 хв</span></div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <h3 id="qTitle">${esc(item.q)}</h3>
        <div class="opts" role="group" aria-labelledby="qTitle">
          ${item.a.map((a, i) => `<button type="button" class="opt" data-opt="${i}" aria-pressed="${answers[step] === i}">${esc(a.t)}</button>`).join("")}
        </div>
        <div class="quiz-nav">
          <button type="button" class="quiz-back" data-back ${step === 0 ? 'style="visibility:hidden" tabindex="-1"' : ""}>← Назад</button>
          <button type="button" class="btn btn-dark" data-next ${answers[step] === null ? "disabled" : ""}>${step === QUIZ.length - 1 ? "Мій результат" : "Далі →"}</button>
        </div>`;
    }
    function score() {
      const total = {};
      answers.forEach((ai, qi) => { if (ai === null) return; const s = QUIZ[qi].a[ai].s; for (const k in s) total[k] = (total[k] || 0) + s[k]; });
      return total;
    }
    function renderResult() {
      const t = score();
      const main = Object.keys(RESULTS).filter((k) => t[k]).sort((a, b) => t[b] - t[a])[0] || "cctv";
      const r = RESULTS[main], paid = courseById(r.course), soon = soonById(r.course);
      const needsNet = (t.net || 0) >= 4, route = [];
      if (needsNet) route.push("Безкоштовний онлайн-курс «Основи мереж» на Kwiga: закриє базу.");
      if (main === "energy") route.push("Безкоштовні онлайн-курси на Kwiga: «Електрика для новачків» та «Інвертори Deye — повний технічний гайд».");
      if (main === "dahua") route.push("Безкоштовні вебінари й інструкції Dahua на Kwiga: DSS, аналітика, домофонія.");
      if (main === "ruijie" && !needsNet) route.push("Безкоштовні онлайн-курси «Основи мереж» і Ruijie Cloud на Kwiga.");
      if (paid) route.push((t.online || 0) >= 3
        ? `Курс ${paid.title} дистанційно, в онлайн-групі з тренером, з іспитом і сертифікатом.`
        : `Очний курс ${paid.title} у лабораторії з іспитом і сертифікатом.`);
      if (soon) route.push(`Курс ${soon.title}: залиште контакт, повідомимо про старт.`);
      if (main === "corp") route.push("Корпоративна програма під ваші об'єкти: обговоримо склад групи й дати.");
      if (main === "energy") route.push("Наступний крок: комплексний курс «Професійний інсталятор сонячних електростанцій».");
      if (main === "cctv") route.push("Наступний крок: HCSA-VMS або HCSA-AAI, коли об'єкти стануть більшими.");
      const title = paid ? paid.title : soon ? soon.title : "Корпоративне навчання";
      const vendor = paid ? paid.vendor : soon ? "Скоро" : "Для компаній";
      $("#quizField").value = `Квіз → ${title}` + (needsNet ? " (+ мережі)" : "");
      box.innerHTML = `
        <div class="quiz-meta"><span>Ваш результат</span><span>${QUIZ.length} з ${QUIZ.length}</span></div>
        <div class="bar"><div style="width:100%"></div></div>
        <div class="result-main"><span class="vendor">${esc(vendor)}</span><h4>${esc(title)}</h4><p>${esc(r.why)}</p></div>
        <ol class="route">${route.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s)}</span></li>`).join("")}</ol>
        <div class="result-ctas">
          <button type="button" class="btn btn-primary" data-signup="${esc(r.course)}">${paid ? "Записатися на курс" : main === "corp" ? "Обговорити навчання" : "Повідомити про старт"} ${A.arrow}</button>
          ${paid ? `<a class="btn btn-dark" href="${courseUrl(paid.id)}">Про курс</a>` : `<a class="btn btn-dark" href="#online">Безкоштовні курси</a>`}
          <button type="button" class="quiz-back" data-restart>Пройти ще раз</button>
        </div>`;
      if (typeof gtag === "function") gtag("event", "quiz_complete", { result: main });
    }
    box.addEventListener("click", (e) => {
      const o = e.target.closest("[data-opt]");
      if (o) { answers[step] = Number(o.dataset.opt); renderQuestion(); setTimeout(() => { if (step < QUIZ.length - 1) { step++; renderQuestion(); } }, 260); return; }
      if (e.target.closest("[data-next]")) { if (answers[step] === null) return; step < QUIZ.length - 1 ? (step++, renderQuestion()) : renderResult(); return; }
      if (e.target.closest("[data-back]")) { if (step > 0) { step--; renderQuestion(); } return; }
      if (e.target.closest("[data-restart]")) { step = 0; answers.fill(null); $("#quizField").value = ""; renderQuestion(); }
    });
    renderQuestion();
  })();

  /* ---------- Schema.org (Google) ---------- */
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify(COURSES.map((c) => ({
    "@context": "https://schema.org", "@type": "Course", name: c.title, description: c.text,
    url: new URL(courseUrl(c.id), location.href).href,
    provider: { "@type": "Organization", name: "Академія Viatec" },
    offers: Number(c.price) > 0 ? { "@type": "Offer", price: c.price, priceCurrency: "UAH", category: "Paid" } : undefined
  })));
  document.head.appendChild(ld);

  A.reveal();
  // якщо прийшли за посиланням з якорем (#robosumo) — докрутити після рендеру
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }
})();
