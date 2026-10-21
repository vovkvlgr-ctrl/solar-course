/* Сторінка курсу: course.html?id=cctv. Вміст — з адмінки (Курси). */
(async function () {
  "use strict";
  const { $, esc } = A;
  let D;
  try { D = await A.load(["settings", "courses", "soon", "schedule"]); } catch (e) { A.fail(e); return; }
  const S = D.settings;
  A.initChrome(S);

  const id = new URLSearchParams(location.search).get("id");
  const c = D.courses.find((x) => x.id === id);

  if (!c) {
    $("#cTitle").textContent = "Курс не знайдено";
    $("#cText").innerHTML = `Можливо, посилання застаріло. <a href="./#courses" style="color:#3FC2B3">Усі курси Академії →</a>`;
    document.querySelectorAll("main > section:not(.hero)").forEach((s) => { if (s.id !== "business") s.hidden = true; });
    $(".buy").hidden = true;
    A.initForm(D, {});
    return;
  }

  /* SEO */
  document.title = c.direction === "Енергетика" ? `${c.title} — курс з енергетики | Академія Viatec` : `${c.title} — сертифікаційний курс ${c.vendor} | Академія Viatec`;
  const md = document.querySelector('meta[name="description"]'); if (md) md.content = c.text;
  const ogt = document.querySelector('meta[property="og:title"]'); if (ogt) ogt.content = document.title;
  const ogd = document.querySelector('meta[property="og:description"]'); if (ogd) ogd.content = c.text;

  /* Hero */
  $("#cCrumb").textContent = c.title;
  $("#cVendor").textContent = c.direction === "Енергетика" ? "Напрям «Енергетика»" : `Сертифікаційний курс ${c.vendor}`;
  $("#cTitle").textContent = c.title;
  $("#cText").textContent = c.text;
  $("#cTags").innerHTML = (c.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
  $("#cPrice").outerHTML = A.priceHtml(c).replace('class="price', 'id="cPrice" class="price');
  if (c.badge) { const b = document.createElement("span"); b.className = "pill " + (c.soon ? "pill-amber" : "pill-hot"); b.style.marginLeft = "10px"; b.textContent = c.badge; $("#cVendor").parentElement.after(b); }
  $("#cFormHead").textContent = `Записатися на ${c.title}`;

  /* Що входить у вартість + реєстрація на viatec.ua */
  const inc = c.included || [];
  const note = document.querySelector(".buy .note");
  if (inc.length) note.outerHTML = `<ul class="incl">${inc.map((i) => `<li>${A.check}<span>${esc(i)}</span></li>`).join("")}</ul>`;
  else note.remove();
  if (c.eventUrl) $("#cNext").insertAdjacentHTML("beforebegin", `<a class="btn btn-ghost-dark" href="${esc(c.eventUrl)}" target="_blank" rel="noopener">Подія на viatec.ua ↗</a>`);

  /* Найближча група */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = (D.schedule || []).filter((r) => r.course === c.id && r.date && A.parseDate(r.end || r.date) >= today)
    .sort((a, b) => A.parseDate(a.date) - A.parseDate(b.date));
  const nextOpen = rows.find((r) => !A.isFull(r));
  if (c.soon) $("#cSignup").textContent = "Повідомити про старт";
  $("#cNext").innerHTML = c.soon ? "Курс стартує незабаром. Залиште контакт, і ми повідомимо першими." : nextOpen
    ? `Найближча група: <b>${esc(A.fmtRange(nextOpen.date, nextOpen.end))}${nextOpen.time ? ", з " + esc(nextOpen.time) : ""}</b>, ${nextOpen.format === "online" ? "онлайн" : esc([nextOpen.city, nextOpen.venue].filter(Boolean).join(", "))}.${nextOpen.seats ? ` Вільно ${Number(nextOpen.seatsLeft)} з ${Number(nextOpen.seats)} місць.` : ""}`
    : "Дати наступних груп уточнюються. Залиште заявку, і ми повідомимо першими.";
  $("#cSignup").addEventListener("click", () => {
    const b = document.createElement("button");
    b.dataset.signup = c.id;
    if (nextOpen) b.dataset.date = A.fmtRange(nextOpen.date, nextOpen.end) + (nextOpen.format === "online" ? ", онлайн" : "");
    b.hidden = true; document.body.appendChild(b); b.click(); b.remove();
  });

  /* Фото, результати, для кого */
  if (c.image) $("#cMedia").innerHTML = `<img src="${esc(c.image)}" alt="${esc(c.title)}">`;
  $("#cOutcomes").innerHTML = (c.outcomes || []).map((o) => `<li>${A.check}<span>${esc(o)}</span></li>`).join("");
  $("#cAudience").textContent = c.audience || "";
  $("#cReq").textContent = c.requirements || "";
  const vid = A.ytId(c.video);
  if (vid) {
    const v = [{ url: c.video, title: `Відео про курс ${c.title}` }];
    $("#cVideo").innerHTML = A.videoCards(v);
    A.bindVideoCards($("#cVideo"), v);
  }

  /* Програма */
  $("#cModules").innerHTML = (c.modules || []).map((m, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(m.title)}</summary><p>${esc(m.text)}</p></details>`).join("");
  if (!(c.modules || []).length) $("#c-program").hidden = true;

  /* Розклад */
  $("#cSchedule").innerHTML = rows.length ? rows.map((r) => {
    const seats = A.seatsPill(r), full = A.isFull(r);
    const action = full
      ? `<button class="link-btn" type="button" data-signup="${esc(c.id)}" data-wait="1">У лист очікування</button>`
      : `<button class="link-btn" type="button" data-signup="${esc(c.id)}" data-date="${esc(A.fmtRange(r.date, r.end))}${r.format === "online" ? ", онлайн" : ""}">Записатися</button>`;
    const place = r.format === "online" ? `<span class="pill pill-teal">Онлайн</span> з будь-якого міста` : `${esc(r.city || "")}${r.venue ? ", " + esc(r.venue) : ""}`;
    return `<tr><td class="strong">${A.dateCell(r)}</td><td class="muted">${place}</td><td class="muted">${esc(r.trainer)}</td><td>${seats}</td><td class="act">${action}</td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">Найближчих груп поки немає. <button class="link-btn" type="button" data-signup="${esc(c.id)}">Залиште заявку</button>, і ми повідомимо про старт.</td></tr>`;

  /* FAQ курсу */
  if ((c.faq || []).length) {
    $("#cFaq").innerHTML = c.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
    $("#c-faq").hidden = false;
  }

  /* Інші курси */
  const others = D.courses.filter((x) => x.id !== c.id);
  if (others.length) $("#cOther").innerHTML = `<p style="color:#8FA6A2;margin:0 0 10px;font-weight:700">Інші курси</p>` +
    others.map((o) => `<a href="course.html?id=${encodeURIComponent(o.id)}" style="color:#fff;display:block;padding:6px 0">${esc(o.title)}${Number(o.price) > 0 ? ` — ${A.money(o.price)} грн` : ""}</a>`).join("");

  /* Schema.org */
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
