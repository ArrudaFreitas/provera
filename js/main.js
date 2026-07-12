(() => {
  "use strict";

  const WHATSAPP = "5588992128750";
  const STORAGE_KEY = "provera_orcamento_v1";
  const PERIOD_LABEL = { dia: "1 dia", semana: "1 semana", mes: "1 mês" };
  const GREETING = "Olá, Proverá Locações! ";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  let cart = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }
  function totalItems() { return Object.values(cart).reduce((n, i) => n + i.qty, 0); }

  function waURL(text) { return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`; }
  function itemBlock([name, item], i) {
    return `${i + 1}. *${name}*\n   Qtd: ${item.qty} · Período: ${PERIOD_LABEL[item.period]}`;
  }
  function buildMessage(entries) {
    const blocks = entries.map(itemBlock).join("\n");
    return `${GREETING}Gostaria de um orçamento para:\n\n${blocks}\n\nFico em [sua cidade]. Podem confirmar os valores, a disponibilidade e o frete?`;
  }
  function cartMessage() { return buildMessage(Object.entries(cart)); }
  function singleMessage(name, item) { return buildMessage([[name, item]]); }

  const countEls = $$("[data-cart-count]");
  const badge = countEls[0];
  let prevItemCount = Object.keys(cart).length;
  let bumping = false;
  function bumpBadge() {
    if (!badge || bumping) return;
    bumping = true;
    badge.classList.add("cart-count--bump");
  }
  if (badge) ["animationend", "animationcancel"].forEach(ev =>
    badge.addEventListener(ev, () => {
      badge.classList.remove("cart-count--bump");
      bumping = false;
    })
  );
  function renderCount() {
    const n = totalItems();
    countEls.forEach(el => {
      el.textContent = n;
      el.hidden = n === 0;
    });
    const itemCount = Object.keys(cart).length;
    if (itemCount > prevItemCount) bumpBadge();
    prevItemCount = itemCount;
  }

  const listEl  = $("[data-cart-list]");
  const emptyEl = $("[data-cart-empty]");
  const footEl  = $("[data-cart-foot]");
  const totalEl = $("[data-cart-total]");
  const sendEl  = $("[data-cart-send]");
  const tpl     = $("[data-cart-item-template]");

  function renderCart() {
    const entries = Object.entries(cart);
    listEl.innerHTML = "";
    const has = entries.length > 0;
    emptyEl.hidden = has;
    footEl.hidden = !has;

    entries.forEach(([name, item]) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      $(".cart-item__name", node).textContent = name;
      const sel = $("[data-period]", node);
      sel.value = item.period;
      sel.addEventListener("change", () => { cart[name].period = sel.value; commit(); });
      $("[data-qty]", node).textContent = item.qty;
      $("[data-inc]", node).addEventListener("click", () => { cart[name].qty++; commit(); });
      $("[data-dec]", node).addEventListener("click", () => {
        cart[name].qty--; if (cart[name].qty <= 0) delete cart[name]; commit();
      });
      $("[data-remove]", node).addEventListener("click", () => { delete cart[name]; commit(); });
      listEl.appendChild(node);
    });

    if (has) {
      totalEl.textContent = `${totalItems()} ${totalItems() === 1 ? "item" : "itens"}`;
      sendEl.href = waURL(cartMessage());
    }
    renderCount();
  }

  function commit() { save(); renderCart(); syncCards(); }

  const grid = $("[data-grid]");
  function selectedPeriod(card) {
    const r = $("input[type=radio]:checked", card);
    return r ? r.value : "dia";
  }
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const name = card.dataset.name;

    if (e.target.closest("[data-card-inc]")) { cart[name].qty++; commit(); return; }
    if (e.target.closest("[data-card-dec]")) {
      cart[name].qty--; if (cart[name].qty <= 0) delete cart[name]; commit(); return;
    }
    if (e.target.closest("[data-add]")) {
      cart[name] = { period: selectedPeriod(card), qty: 1 }; commit(); return;
    }
    if (e.target.closest("[data-quick]")) {
      const item = cart[name] || { period: selectedPeriod(card), qty: 1 };
      window.open(waURL(singleMessage(name, item)), "_blank", "noopener");
      return;
    }
  });

  grid.addEventListener("change", (e) => {
    const radio = e.target.closest('input[type="radio"]');
    if (!radio) return;
    const card = e.target.closest(".card");
    const name = card && card.dataset.name;
    if (name && cart[name]) { cart[name].period = radio.value; commit(); }
  });

  function ensureStepper(card) {
    let s = card.querySelector("[data-card-stepper]");
    if (!s) {
      const addBtn = card.querySelector("[data-add]");
      const name = card.dataset.name;
      s = document.createElement("div");
      s.className = "qty-stepper";
      s.setAttribute("data-card-stepper", "");
      s.hidden = true;
      s.innerHTML =
        `<button type="button" class="qty-stepper__btn" data-card-dec aria-label="Diminuir ${name} no orçamento">−</button>` +
        `<span class="qty-stepper__val" data-card-qty aria-live="polite">1</span>` +
        `<button type="button" class="qty-stepper__btn" data-card-inc aria-label="Aumentar ${name} no orçamento">+</button>`;
      addBtn.insertAdjacentElement("afterend", s);
    }
    return s;
  }
  function syncCards() {
    $$(".card", grid).forEach(card => {
      const name = card.dataset.name;
      const addBtn = card.querySelector("[data-add]");
      const stepper = ensureStepper(card);
      const item = cart[name];
      if (item) {
        addBtn.hidden = true; stepper.hidden = false;
        stepper.querySelector("[data-card-qty]").textContent = item.qty;
        const r = card.querySelector(`input[type="radio"][value="${item.period}"]`);
        if (r) r.checked = true;
      } else {
        addBtn.hidden = false; stepper.hidden = true;
      }
    });
  }

  const drawer  = $("[data-drawer]");
  const overlay = $("[data-overlay]");
  const closeBtn = $("[data-cart-close]");
  let lastFocus = null;

  function openDrawer() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => { overlay.classList.add("is-open"); drawer.classList.add("is-open"); });
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }
  function closeDrawer() {
    overlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    setTimeout(() => { overlay.hidden = true; }, 280);
    if (lastFocus) lastFocus.focus();
  }
  function onKeydown(e) {
    if (e.key === "Escape") closeDrawer();
    if (e.key === "Tab") {
      const f = $$('a[href], button:not([disabled]), select, [tabindex]:not([tabindex="-1"])', drawer)
        .filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  $$("[data-cart-open]").forEach(b => b.addEventListener("click", openDrawer));
  closeBtn.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  $("[data-cart-clear]").addEventListener("click", () => { cart = {}; commit(); });

  const chips = $$("[data-filters] .chip");
  const searchInput = $("[data-search-input]");
  const emptyGrid = $("[data-empty]");
  const emptyTerm = $("[data-empty-term]");
  let activeCat = "todos";

  function applyFilters() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const cards = $$(".card", grid);
    let visible = 0;
    cards.forEach(card => {
      const matchCat = activeCat === "todos" || card.dataset.category === activeCat;
      const matchText = !q || card.dataset.name.toLowerCase().includes(q);
      const show = matchCat && matchText;
      card.hidden = !show;
      if (show) visible++;
    });

    const noResults = visible === 0;
    emptyGrid.hidden = !noResults;
    if (noResults) {
      cards.forEach(card => { card.hidden = false; });
      if (emptyTerm) emptyTerm.textContent = q ? `“${searchInput.value.trim()}”` : "sua busca";
    }
  }
  chips.forEach(chip => chip.addEventListener("click", () => {
    chips.forEach(c => { c.classList.remove("is-active"); c.setAttribute("aria-pressed", "false"); });
    chip.classList.add("is-active"); chip.setAttribute("aria-pressed", "true");
    activeCat = chip.dataset.filter;
    applyFilters();
    chip.scrollIntoView({
      inline: "center", block: "nearest",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }));
  searchInput.addEventListener("input", applyFilters);
  const clearSearch = $("[data-clear-search]");
  if (clearSearch) clearSearch.addEventListener("click", () => { searchInput.value = ""; applyFilters(); searchInput.focus(); });

  $$("[data-wa-link]").forEach(a => {
    a.href = waURL(`${GREETING}Vim pelo site e gostaria de mais informações sobre a locação de equipamentos.`);
    a.target = "_blank";
    a.rel = "noopener";
  });
  if (sendEl) { sendEl.target = "_blank"; sendEl.rel = "noopener"; }

  const header = $("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  renderCart();
  syncCards();
})();
