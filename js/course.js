/* Лендінг курсу: course.html?id=cctv. Увесь вміст — з адмінки (Курси).
   Кожен блок показується, лише якщо для нього є дані. */
(async function () {
  "use strict";
  const { $, esc } = A;
  let D;
  try { D = await A.load(["settings", "courses", "soon", "schedule", "trainers"]); } catch (e) { A.fail(e); return; }
  const S = D.settings;
  A.initChrome(S);

  const id = new URLSearchParams(location.search).get("id");
  const c = D.courses.find((x) => x.id === id);
  const show = (sel) => { const el = $(sel); if (el) el.hidden = false; };
  const hide = (sel) => { const el = $(sel); if (el) el.hidden = true; };
  const list = (arr) => (arr || []).filter((x) => x && String(x).trim());
  const xIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  if (!c) {
    $("#cTitle").textContent = "Курс не знайдено";
    $("#cText").innerHTML = `Можливо, посилання застаріло. <a href="./#courses">Усі курси Академії →</a>`;
    document.querySelectorAll("main > section:not(.hero)").forEach((s) => { if (s.id !== "business") s.hidden = true; });
    hide(".buy"); hide(".c-ctas");
    A.initForm(D, {});
    return;
  }

  /* ---------- SEO ---------- */
  document.title = c.direction === "Енергетика" ? `${c.title} — курс з енергетики | Академія Viatec` : `${c.title} — сертифікаційний курс ${c.vendor} | Академія Viatec`;
  const md = document.querySelector('meta[name="description"]'); if (md) md.content = c.text;
  const ogt = document.querySelector('meta[property="og:title"]'); if (ogt) ogt.content = document.title;
  const ogd = document.querySelector('meta[property="og:description"]'); if (ogd) ogd.content = c.text;

  /* ---------- Найближча група ---------- */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = (D.schedule || []).filter((r) => r.course === c.id && r.date && A.parseDate(r.end || r.date) >= today)
    .sort((a, b) => A.parseDate(a.date) - A.parseDate(b.date));
  const next = rows.find((r) => !A.isFull(r));
  const nextLabel = next ? `${A.fmtRange(next.date, next.end)}${next.time ? ", з " + next.time : ""}` : "";
  const nextPlace = next ? (next.format === "online" ? "онлайн" : [next.city, next.venue].filter(Boolean).join(", ")) : "";

  /* ---------- 1. Перший екран ---------- */
  $("#cCrumb").textContent = c.title;
  $("#cVendor").textContent = c.direction === "Енергетика" ? "Напрям «Енергетика»" : `Сертифікаційний курс ${c.vendor}`;
  if (c.badge) $(".c-badges").insertAdjacentHTML("beforeend", `<span class="pill ${c.soon ? "pill-amber" : "pill-hot"}">${esc(c.badge)}</span>`);
  $("#cTitle").textContent = c.title;
  if (c.subtitle) $("#cSub").textContent = c.subtitle; else hide("#cSub");
  $("#cText").textContent = c.text;

  // ключові факти: з поля facts, інакше з тегів
  const facts = (c.facts && c.facts.length) ? c.facts : list(c.tags).map((t) => ({ label: "", value: t }));
  const icons = {
    "Тривалість": '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
    "Формат": '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    "Група": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.9 2.7 2.6 3 5.2"/>',
    "Сертифікат": '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>'
  };
  $("#cFacts").innerHTML = facts.map((f) => `
    <div class="fact"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[f.label] || '<path d="M20 6L9 17l-5-5"/>'}</svg>
      <div>${f.label ? `<small>${esc(f.label)}</small>` : ""}<b>${esc(f.value)}</b></div></div>`).join("");

  // картка ціни
  $("#cPrice").outerHTML = A.priceHtml(c).replace('class="price', 'id="cPrice" class="price');
  const seatsInfo = next && next.seats !== "" && next.seats != null && next.seatsLeft !== "" && next.seatsLeft != null
    ? `<span class="pill ${Number(next.seatsLeft) <= Math.max(3, Math.ceil(Number(next.seats) * 0.3)) ? "pill-amber" : "pill-teal"}">Вільно ${Number(next.seatsLeft)} з ${Number(next.seats)} місць</span>` : "";
  $("#cNext").innerHTML = c.soon
    ? "Курс стартує незабаром. Залиште контакт — повідомимо першими."
    : next
      ? `<small>Найближча група</small><b>${esc(nextLabel)}</b><span>${esc(nextPlace)}</span>${seatsInfo}`
      : "<small>Найближча група</small><b>Дату уточнюємо</b><span>Залиште заявку — повідомимо першими.</span>";
  if (c.eventUrl) $("#cSignup").insertAdjacentHTML("afterend", `<a class="btn btn-ghost-dark" href="${esc(c.eventUrl)}" target="_blank" rel="noopener">Сторінка курсу на viatec.ua ↗</a>`);
  if (c.soon) { $("#cSignup").textContent = "Повідомити про старт"; $("#cSignupHero").textContent = "Повідомити про старт"; }

  // будь-яка кнопка запису відкриває форму з цим курсом і датою
  const openSignup = () => {
    const b = document.createElement("button");
    b.dataset.signup = c.id;
    if (next) b.dataset.date = A.fmtRange(next.date, next.end) + (next.format === "online" ? ", онлайн" : "");
    b.hidden = true; document.body.appendChild(b); b.click(); b.remove();
  };
  ["#cSignup", "#cSignupHero"].forEach((s) => $(s).addEventListener("click", openSignup));
  document.querySelectorAll("[data-course-signup]").forEach((b) => b.addEventListener("click", openSignup));

  /* ---------- 2. Біль → результат ---------- */
  const pains = list(c.pains), outs = list(c.outcomes);
  if (outs.length) {
    $("#cOutcomes").innerHTML = outs.map((o) => `<li>${A.check}<span>${esc(o)}</span></li>`).join("");
    if (pains.length) $("#cPains").innerHTML = pains.map((p) => `<li>${xIcon}<span>${esc(p)}</span></li>`).join("");
    else { $(".pain-bad").remove(); $("#c-pain h2").textContent = "Що ви вмітимете після курсу"; }
    show("#c-pain");
  }

  /* ---------- 3. Формати ---------- */
  if ((c.formats || []).length) {
    $("#cFormats").innerHTML = c.formats.map((f, i) => `
      <div class="fmt reveal"><span class="fmt-num">${i + 1}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join("");
    show("#c-formats");
  }

  /* ---------- 4. Програма й вимоги ---------- */
  const mods = c.modules || [];
  $("#cModules").innerHTML = mods.map((m, i) => `
    <details${i === 0 ? " open" : ""}><summary><span class="m-num">${String(i + 1).padStart(2, "0")}</span>${esc(m.title)}</summary><p>${esc(m.text)}</p></details>`).join("");
  if (!mods.length) $(".prog-list").remove();
  const req = list(c.requirementsList).length ? list(c.requirementsList) : (c.requirements ? [c.requirements] : []);
  if (req.length) $("#cReq").innerHTML = req.map((r) => `<li>${A.check}<span>${esc(r)}</span></li>`).join(""); else $("#cReqBox").remove();
  if (c.audience) $("#cAudience").textContent = c.audience; else $("#cAudBox").remove();
  if (!mods.length && !req.length && !c.audience) hide("#c-program");
  const vid = A.ytId(c.video);
  if (vid) { const v = [{ url: c.video, title: `Відео про курс ${c.title}` }]; $("#cVideo").innerHTML = A.videoCards(v); A.bindVideoCards($("#cVideo"), v); }

  /* ---------- 5. Сертифікат ---------- */
  if (c.certificate && c.certificate.title) {
    $("#cCertTitle").textContent = c.certificate.title;
    $("#cCertText").textContent = c.certificate.text || "";
    $("#cCertPoints").innerHTML = list(c.certificate.points).map((p) => `<li>${A.check}<span>${esc(p)}</span></li>`).join("");
    show("#c-cert");
  }

  /* ---------- 6. Шлях ---------- */
  if ((c.path || []).length) {
    $("#cPath").innerHTML = c.path.map((p, i) => `
      <li class="${p.title === c.title ? "here" : ""}"><span class="p-num">${i + 1}</span><div><b>${esc(p.title)}</b><p>${esc(p.text || "")}</p>
        ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">Перейти →</a>` : ""}</div></li>`).join("");
    show("#c-path");
  }

  /* ---------- 7. Тренери ---------- */
  const tr = (c.trainers || []).map((tid) => (D.trainers || []).find((t) => t.id === tid)).filter(Boolean);
  if (tr.length) {
    const sil = '<svg viewBox="0 0 96 96" aria-hidden="true"><rect width="96" height="96" fill="#e3f4f6"/><circle cx="48" cy="38" r="17" fill="#9fcfd8"/><path d="M14 96c3-20 17-31 34-31s31 11 34 31z" fill="#9fcfd8"/></svg>';
    $("#cTrainers").innerHTML = tr.map((t) => `
      <article class="tr-card"><div class="tr-photo">${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.name)}" loading="lazy">` : sil}</div>
        <div class="tr-body"><h4>${esc(t.name)}</h4><div class="tr-role">${esc(t.role || "")}</div>${t.text ? `<p>${esc(t.text)}</p>` : ""}</div></article>`).join("");
    show("#c-trainers");
  }

  /* ---------- 8. Що входить ---------- */
  const inc = list(c.included);
  if (inc.length) {
    $("#cPrice2").textContent = Number(c.price) > 0 ? `${A.money(c.price)} грн` : "вартість";
    $("#cIncluded").innerHTML = inc.map((i) => `<li>${A.check}<span>${esc(i)}</span></li>`).join("");
    show("#c-incl");
  }

  /* ---------- 9. Розклад ---------- */
  $("#cSchedule").innerHTML = rows.length ? rows.map((r) => {
    const full = A.isFull(r);
    const action = full
      ? `<button class="link-btn" type="button" data-signup="${esc(c.id)}" data-wait="1">У лист очікування</button>`
      : `<button class="link-btn" type="button" data-signup="${esc(c.id)}" data-date="${esc(A.fmtRange(r.date, r.end))}${r.format === "online" ? ", онлайн" : ""}">Записатися</button>`;
    const place = r.format === "online" ? `<span class="pill pill-teal">Онлайн</span> з будь-якого міста` : `${esc(r.city || "")}${r.venue ? ", " + esc(r.venue) : ""}`;
    return `<tr><td class="strong">${A.dateCell(r)}</td><td class="muted">${place}</td><td class="muted">${esc(r.trainer || "")}</td><td>${A.seatsPill(r)}</td><td class="act">${action}</td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">Найближчих груп поки немає. <button class="link-btn" type="button" data-signup="${esc(c.id)}">Залиште заявку</button>, і ми повідомимо про старт.</td></tr>`;

  /* ---------- 10. FAQ ---------- */
  if ((c.faq || []).length) {
    $("#cFaq").innerHTML = c.faq.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
    show("#c-faq");
  }

  /* ---------- Форма, інші курси ---------- */
  $("#cFormHead").textContent = `Записатися на ${c.title}`;
  const others = D.courses.filter((x) => x.id !== c.id);
  if (others.length) $("#cOther").innerHTML = `<p class="other-h">Інші курси</p>` +
    others.map((o) => `<a href="course.html?id=${encodeURIComponent(o.id)}">${esc(o.title)}${Number(o.price) > 0 ? ` — ${A.money(o.price)} грн` : ""}</a>`).join("");

  /* ---------- Липка панель на телефоні ---------- */
  $("#stickyPrice").textContent = Number(c.price) > 0 ? `${A.money(c.price)} грн` : "Ціна за запитом";
  $("#stickyNext").textContent = next ? `Група: ${nextLabel}` : "";
  const sticky = $("#stickyCta"), heroBtn = $("#cSignupHero"), form = $("#signup");
  if ("IntersectionObserver" in window) {
    let heroVisible = true, formVisible = false;
    const upd = () => { sticky.hidden = heroVisible || formVisible; };
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; upd(); }).observe(heroBtn);
    new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; upd(); }).observe(form);
  }

  /* ---------- Schema.org ---------- */
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org", "@type": "Course", name: c.title, description: c.text,
    provider: { "@type": "Organization", name: "Академія Viatec" },
    offers: Number(c.price) > 0 ? { "@type": "Offer", price: c.price, priceCurrency: "UAH", category: "Paid" } : undefined,
    hasCourseInstance: rows.map((r) => ({ "@type": "CourseInstance", courseMode: r.format === "online" ? "online" : "onsite", startDate: r.date, endDate: r.end || r.date, location: r.format === "online" ? undefined : r.city }))
  });
  document.head.appendChild(ld);

  A.initForm(D, { preselect: c.id });
  A.reveal();
})();
