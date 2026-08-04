/* eslint-env browser */
(function () {
  "use strict";

  const STORAGE_KEY = "kcal.v1";
  const RING_C = 2 * Math.PI * 86;

  // ------------------------------------------------------------------ état

  const defaults = {
    targetA: 2140,
    switchDate: "2026-08-17",   // dernier jour à l'objectif A
    targetB: 2275,
    days: {},                   // "2026-08-04": [entry, ...]
    custom: [],                 // aliments appris
  };

  let state = load();
  let viewDate = todayKey();
  let editingId = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, defaults);
      return Object.assign({}, defaults, JSON.parse(raw));
    } catch (e) {
      return Object.assign({}, defaults);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast("Sauvegarde impossible (stockage plein ?)");
    }
  }

  // ------------------------------------------------------------------ dates

  function ymd(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function todayKey() { return ymd(new Date()); }

  function fromKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftKey(key, days) {
    const d = fromKey(key);
    d.setDate(d.getDate() + days);
    return ymd(d);
  }

  function targetFor(key) {
    return key <= state.switchDate ? state.targetA : state.targetB;
  }

  const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const DAYS_SHORT = ["D", "L", "M", "M", "J", "V", "S"];
  const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  function labelFor(key) {
    const t = todayKey();
    if (key === t) return "Aujourd'hui";
    if (key === shiftKey(t, -1)) return "Hier";
    if (key === shiftKey(t, 1)) return "Demain";
    const d = fromKey(key);
    return `${DAYS_FR[d.getDay()]} ${d.getDate()}`;
  }

  function subLabelFor(key) {
    const d = fromKey(key);
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ------------------------------------------------------------------ repas

  function entriesFor(key) { return state.days[key] || []; }

  function addEntries(list) {
    if (!list.length) return;
    if (!state.days[viewDate]) state.days[viewDate] = [];
    state.days[viewDate].push(...list);
    save();
    render();
    if (navigator.vibrate) navigator.vibrate(12);
  }

  /** Transforme une ligne analysée en entrée stockable. */
  function toEntry(item) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (item.unknown) {
      return {
        id, name: item.raw || item.name, sub: "calories inconnues",
        grams: item.grams || null, kcal: null, prot: 0,
        k100: null, p100: 0, unknown: true, query: item.name, alts: [],
      };
    }
    return {
      id,
      name: item.food.n,
      sub: `${item.grams} g`,
      grams: item.grams,
      kcal: item.kcal,
      prot: item.prot,
      k100: item.food.k,
      p100: item.food.p || 0,
      unknown: false,
      query: item.name,
      alts: item.matches.slice(0, 5).map((f) => f.n),
    };
  }

  function findFood(name) {
    return state.custom.concat(FOODS).find((f) => f.n === name) || null;
  }

  // ------------------------------------------------- aliments personnalisés

  /** Mémorise un aliment corrigé à la main pour la prochaine fois. */
  function learn(query, grams, kcal) {
    const clean = (query || "").trim();
    if (!clean || !kcal) return;
    const base = grams || 100;
    const per100 = Math.round((kcal / base) * 100 * 10) / 10;
    const name = clean.charAt(0).toUpperCase() + clean.slice(1);

    const existing = state.custom.find(
      (f) => Parser.normalize(f.n) === Parser.normalize(name)
    );
    if (existing) {
      existing.k = per100;
      existing.s = base;
    } else {
      state.custom.push({ n: name, k: per100, p: 0, s: base, custom: true, a: [clean] });
    }
    save();
  }

  // ------------------------------------------------------------------ rendu

  const $ = (id) => document.getElementById(id);
  const el = {
    remaining: $("remaining"), remainingLabel: $("remainingLabel"),
    eaten: $("eaten"), target: $("target"), protein: $("protein"),
    ring: $("ringFill"), entries: $("entries"), empty: $("empty"),
    chips: $("chips"), dateLabel: $("dateLabel"), preview: $("preview"),
    weekBars: $("weekBars"), weekNote: $("weekNote"), input: $("input"),
  };

  function render() {
    const list = entriesFor(viewDate);
    const target = targetFor(viewDate);
    const eaten = list.reduce((s, e) => s + (e.kcal || 0), 0);
    const prot = list.reduce((s, e) => s + (e.prot || 0), 0);
    const left = target - eaten;

    el.dateLabel.querySelector(".date-main").textContent = labelFor(viewDate);
    el.dateLabel.querySelector(".date-sub").textContent = subLabelFor(viewDate);

    document.body.classList.toggle("over", left < 0);
    el.remaining.textContent = left >= 0 ? left : `+${-left}`;
    el.remainingLabel.textContent = left >= 0 ? "kcal restantes" : "kcal au-dessus";
    el.eaten.textContent = eaten;
    el.target.textContent = target;
    el.protein.textContent = `${prot} g`;

    const ratio = target > 0 ? Math.min(eaten / target, 1) : 0;
    el.ring.style.strokeDashoffset = String(RING_C * (1 - ratio));

    renderEntries(list);
    renderChips(list);
    renderWeek();
  }

  function renderEntries(list) {
    el.entries.innerHTML = "";
    el.empty.hidden = list.length > 0;

    for (const e of list) {
      const li = document.createElement("li");

      if (e.unknown) {
        li.className = "entry unknown";
        li.innerHTML = `
          <div class="entry-main">
            <div class="entry-name">${escapeHtml(e.name)}</div>
            <div class="entry-sub">combien de kcal ?</div>
          </div>`;
        const fix = document.createElement("input");
        fix.className = "entry-fix";
        fix.type = "number";
        fix.inputMode = "numeric";
        fix.placeholder = "kcal";
        fix.addEventListener("change", () => {
          const v = parseInt(fix.value, 10);
          if (!v || v < 0) return;
          e.kcal = v;
          e.unknown = false;
          e.sub = e.grams ? `${e.grams} g` : "saisi à la main";
          e.k100 = e.grams ? Math.round((v / e.grams) * 100) : v;
          learn(e.query, e.grams, v);
          save();
          render();
          toast("Retenu pour la prochaine fois");
        });
        fix.addEventListener("keydown", (ev) => { if (ev.key === "Enter") fix.blur(); });
        li.appendChild(fix);
        // le nom reste cliquable pour corriger ou supprimer la ligne
        li.querySelector(".entry-main").addEventListener("click", () => openEdit(e.id));
      } else {
        li.className = "entry";
        li.innerHTML = `
          <div class="entry-main">
            <div class="entry-name">${escapeHtml(e.name)}</div>
            <div class="entry-sub">${escapeHtml(e.sub)}${e.prot ? ` · ${e.prot} g prot` : ""}</div>
          </div>
          <div class="entry-kcal">${e.kcal}</div>`;
        li.addEventListener("click", () => openEdit(e.id));
      }

      el.entries.appendChild(li);
    }
  }

  /** Raccourcis : ce qu'il mange le plus souvent, en un tap. */
  function renderChips(todayList) {
    const counts = new Map();
    const keys = Object.keys(state.days).sort().slice(-45);

    for (const day of keys) {
      for (const e of state.days[day]) {
        if (e.unknown || !e.kcal) continue;
        const sig = `${e.name}|${e.grams}`;
        const c = counts.get(sig) || { n: 0, entry: e };
        c.n += 1;
        c.entry = e;
        counts.set(sig, c);
      }
    }

    const already = new Set(todayList.map((e) => `${e.name}|${e.grams}`));
    const top = [...counts.entries()]
      .filter(([sig, c]) => c.n >= 2 && !already.has(sig))
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 10);

    el.chips.innerHTML = "";
    for (const [, c] of top) {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.type = "button";
      btn.innerHTML = `${escapeHtml(c.entry.name)}<span>${c.entry.kcal}</span>`;
      btn.addEventListener("click", () => {
        const copy = Object.assign({}, c.entry, {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        });
        addEntries([copy]);
      });
      el.chips.appendChild(btn);
    }
  }

  function renderWeek() {
    el.weekBars.innerHTML = "";
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(shiftKey(viewDate, -i));

    const totals = days.map((k) =>
      entriesFor(k).reduce((s, e) => s + (e.kcal || 0), 0)
    );
    const scale = Math.max(...totals, targetFor(viewDate)) * 1.05;

    days.forEach((key, i) => {
      const total = totals[i];
      const target = targetFor(key);
      const d = fromKey(key);
      const div = document.createElement("div");
      div.className = "wday";
      if (total > target) div.classList.add("over");
      if (key === viewDate) div.classList.add("today");
      if (total === 0) div.classList.add("empty-day");
      div.innerHTML = `
        <div class="wbar" style="height:${scale ? Math.max((total / scale) * 100, 2) : 2}%"></div>
        <div class="wlabel">${DAYS_SHORT[d.getDay()]}</div>`;
      div.addEventListener("click", () => { viewDate = key; render(); });
      el.weekBars.appendChild(div);
    });

    // la journée en cours n'est pas finie : elle fausserait la moyenne
    const t = todayKey();
    const all = days.map((k, i) => ({ k, v: totals[i] })).filter((o) => o.v > 0);
    let values = all.filter((o) => o.k !== t);
    if (!values.length) values = all;

    if (values.length) {
      const avg = Math.round(values.reduce((a, o) => a + o.v, 0) / values.length);
      const diff = avg - targetFor(viewDate);
      el.weekNote.textContent =
        `Moyenne ${avg} kcal/j sur ${values.length} jour${values.length > 1 ? "s" : ""} · ` +
        (diff >= 0 ? `+${diff}` : `${diff}`) + " vs objectif";
    } else {
      el.weekNote.textContent = "";
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // ------------------------------------------------------------- saisie

  $("composer").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = el.input.value.trim();
    if (!text) return;

    const items = Parser.parseMeal(text, state.custom);
    if (!items.length) { toast("Je n'ai rien compris là 🤔"); return; }

    addEntries(items.map(toEntry));
    el.input.value = "";
    el.preview.hidden = true;
    el.input.focus();
  });

  let previewTimer = null;
  el.input.addEventListener("input", () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const text = el.input.value.trim();
      if (text.length < 2) { el.preview.hidden = true; return; }
      const items = Parser.parseMeal(text, state.custom);
      if (!items.length) { el.preview.hidden = true; return; }
      const total = items.reduce((s, i) => s + (i.kcal || 0), 0);
      const parts = items.map((i) =>
        i.unknown ? `<b>?</b> ${escapeHtml(i.name)}` : `${escapeHtml(i.food.n)} ${i.grams} g`
      );
      el.preview.innerHTML = `<b>≈ ${total} kcal</b> — ${parts.join(" · ")}`;
      el.preview.hidden = false;
    }, 180);
  });

  // ---------------------------------------------------------- navigation

  $("prevDay").addEventListener("click", () => { viewDate = shiftKey(viewDate, -1); render(); });
  $("nextDay").addEventListener("click", () => { viewDate = shiftKey(viewDate, 1); render(); });
  el.dateLabel.addEventListener("click", () => { viewDate = todayKey(); render(); });

  $("copyYesterday").addEventListener("click", () => {
    const prev = entriesFor(shiftKey(viewDate, -1));
    if (!prev.length) { toast("Rien à copier hier"); return; }
    addEntries(prev.map((e) => Object.assign({}, e, {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    })));
  });

  // ------------------------------------------------------ feuille édition

  function openEdit(id) {
    const e = entriesFor(viewDate).find((x) => x.id === id);
    if (!e) return;
    editingId = id;

    $("editTitle").textContent = e.name;
    $("editGrams").value = e.grams != null ? e.grams : "";
    $("editKcal").value = e.kcal != null ? e.kcal : "";

    const alts = $("alts");
    alts.innerHTML = "";
    const options = (e.alts || []).filter(Boolean);
    $("altField").hidden = options.length < 2;
    for (const name of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "alt" + (name === e.name ? " on" : "");
      b.textContent = name;
      b.addEventListener("click", () => {
        const food = findFood(name);
        if (!food) return;
        e.name = food.n;
        e.k100 = food.k;
        e.p100 = food.p || 0;
        $("editTitle").textContent = food.n;
        const g = parseFloat($("editGrams").value) || e.grams || 100;
        $("editKcal").value = Math.round((g * food.k) / 100);
        [...alts.children].forEach((c) => c.classList.toggle("on", c.textContent === name));
      });
      alts.appendChild(b);
    }

    openSheet("editSheet");
  }

  // grammes modifiés -> kcal recalculées
  $("editGrams").addEventListener("input", () => {
    const e = entriesFor(viewDate).find((x) => x.id === editingId);
    if (!e || !e.k100) return;
    const g = parseFloat($("editGrams").value);
    if (!isNaN(g)) $("editKcal").value = Math.round((g * e.k100) / 100);
  });

  $("saveEntry").addEventListener("click", () => {
    const e = entriesFor(viewDate).find((x) => x.id === editingId);
    if (!e) return closeSheets();
    const g = parseFloat($("editGrams").value);
    const k = parseInt($("editKcal").value, 10);

    e.grams = isNaN(g) ? null : Math.round(g);
    e.kcal = isNaN(k) ? e.kcal : k;
    e.sub = e.grams ? `${e.grams} g` : "à la main";
    e.prot = e.grams && e.p100 ? Math.round((e.grams * e.p100) / 100) : 0;
    if (e.grams && e.kcal) e.k100 = Math.round((e.kcal / e.grams) * 100);

    save();
    render();
    closeSheets();
  });

  $("deleteEntry").addEventListener("click", () => {
    const list = entriesFor(viewDate);
    const i = list.findIndex((x) => x.id === editingId);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) delete state.days[viewDate];
    save();
    render();
    closeSheets();
  });

  // ------------------------------------------------------ feuille réglages

  $("openSettings").addEventListener("click", () => {
    $("targetA").value = state.targetA;
    $("switchDate").value = state.switchDate;
    $("targetB").value = state.targetB;
    renderCustomList();
    openSheet("settingsSheet");
  });

  function renderCustomList() {
    const box = $("customList");
    box.innerHTML = "";
    $("customCount").textContent = state.custom.length ? `(${state.custom.length})` : "";
    state.custom.forEach((f, i) => {
      const row = document.createElement("div");
      row.className = "custom-row";
      row.innerHTML = `<span>${escapeHtml(f.n)}</span><small>${f.k} kcal/100 g</small>`;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.setAttribute("aria-label", "Supprimer");
      del.addEventListener("click", () => {
        state.custom.splice(i, 1);
        save();
        renderCustomList();
      });
      row.appendChild(del);
      box.appendChild(row);
    });
  }

  function applySettings() {
    const a = parseInt($("targetA").value, 10);
    const b = parseInt($("targetB").value, 10);
    if (a > 0) state.targetA = a;
    if (b > 0) state.targetB = b;
    if ($("switchDate").value) state.switchDate = $("switchDate").value;
    save();
    render();
  }

  ["targetA", "targetB", "switchDate"].forEach((id) =>
    $(id).addEventListener("change", applySettings)
  );

  $("closeSettings").addEventListener("click", () => { applySettings(); closeSheets(); });

  $("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kcal-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Sauvegarde exportée");
  });

  $("importData").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || !data.days) throw new Error("format");
        if (!confirm("Remplacer les données actuelles par cette sauvegarde ?")) return;
        state = Object.assign({}, defaults, data);
        save();
        render();
        renderCustomList();
        toast("Sauvegarde importée");
      } catch (e) {
        toast("Fichier illisible");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  // ------------------------------------------------------------- feuilles

  function openSheet(id) {
    $("scrim").hidden = false;
    $(id).hidden = false;
  }

  function closeSheets() {
    $("scrim").hidden = true;
    $("editSheet").hidden = true;
    $("settingsSheet").hidden = true;
    editingId = null;
  }

  $("scrim").addEventListener("click", () => {
    if (!$("settingsSheet").hidden) applySettings();
    closeSheets();
  });

  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeSheets(); });

  // ---------------------------------------------------------------- toast

  let toastTimer = null;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ------------------------------------------------------------- démarrage

  // le jour change pendant que l'app reste ouverte
  let lastSeenDay = todayKey();
  setInterval(() => {
    const now = todayKey();
    if (now !== lastSeenDay) {
      if (viewDate === lastSeenDay) viewDate = now;
      lastSeenDay = now;
      render();
    }
  }, 60000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && todayKey() !== lastSeenDay) {
      viewDate = lastSeenDay = todayKey();
      render();
    }
  });

  render();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
