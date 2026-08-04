/*
 * Analyse une phrase du type "2 oeufs, 80g de riz et une pomme"
 * et la transforme en lignes { aliment, grammes, kcal, proteines }.
 */

// ---------------------------------------------------------------- outils

// FOODS est global dans le navigateur (foods.js chargé avant), requis sous Node.
const FOOD_DB = typeof FOODS !== "undefined" ? FOODS : require("./foods.js").FOODS;

function normalize(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // accents
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/['`’]/g, " ")
    .replace(/[^a-z0-9%\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "de", "du", "des", "d", "la", "le", "les", "l", "un", "une", "au", "aux",
  "a", "en", "avec", "et", "ou", "mon", "ma", "mes", "ce", "cette", "sans",
  "nature", "frais", "fraiche", "environ", "peu", "quelques", "petit", "petite",
]);

function tokens(str) {
  return normalize(str)
    .split(" ")
    .map((t) => t.replace(/s$/, "").replace(/x$/, ""))  // pluriels
    .filter((t) => t && !STOPWORDS.has(t));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

// --------------------------------------------------------------- nombres

const WORD_NUMBERS = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20,
  demi: 0.5, demie: 0.5, moitie: 0.5, quart: 0.25,
};

// Poids par défaut (en g) des portions courantes.
const PORTIONS = {
  tranche: 30, rondelle: 20, morceau: 50, bout: 50, part: 100, portion: 100,
  cas: 15, cac: 5, cuillere: 15, "cuillere a soupe": 15, "cuillere a cafe": 5,
  bol: 250, assiette: 300, verre: 200, tasse: 150, mug: 250, coupe: 100,
  poignee: 30, pincee: 1, boule: 60, carre: 10, gousse: 4, feuille: 5,
  pot: 125, sachet: 100, paquet: 100, barquette: 200, boite: 150, brique: 250,
  canette: 330, cannette: 330, bouteille: 500, dose: 30, scoop: 30, shot: 40,
  demi: 250, pinte: 500, gourde: 90, filet: 5, noisette: 5, tablette: 100,
  plaquette: 250, cornet: 150, dosette: 12, grappe: 150, sucrette: 5, pave: 130,
};

// Écritures alternatives des portions -> clé canonique.
const PORTION_ALIASES = {
  "c a s": "cas", "cs": "cas", "cuilleres a soupe": "cas", "cuillere a soupe": "cas",
  "cuilleres": "cuillere", "cuillere a cafe": "cac", "cuilleres a cafe": "cac",
  "c a c": "cac", "cc": "cac", "cuiller": "cuillere",
  "tranches": "tranche", "rondelles": "rondelle", "morceaux": "morceau",
  "parts": "part", "portions": "portion", "bols": "bol", "assiettes": "assiette",
  "verres": "verre", "tasses": "tasse", "mugs": "mug", "coupes": "coupe",
  "poignees": "poignee", "pincees": "pincee", "boules": "boule", "carres": "carre",
  "gousses": "gousse", "feuilles": "feuille", "pots": "pot", "sachets": "sachet",
  "paquets": "paquet", "barquettes": "barquette", "boites": "boite",
  "briques": "brique", "canettes": "canette", "bouteilles": "bouteille",
  "doses": "dose", "scoops": "scoop", "shots": "shot", "pintes": "pinte",
  "gourdes": "gourde", "tablettes": "tablette", "cornets": "cornet",
};

// Tailles : "grande frites", "petit cafe"...
const SIZES = {
  petit: 0.7, petite: 0.7, mini: 0.55, moyen: 1, moyenne: 1,
  grand: 1.4, grande: 1.4, gros: 1.3, grosse: 1.3, maxi: 1.6, xl: 1.6, xxl: 1.9,
};

const MASS_UNITS = {
  g: 1, gr: 1, gramme: 1, grammes: 1, kg: 1000, kilo: 1000, kilos: 1000,
  ml: 1, cl: 10, dl: 100, l: 1000, litre: 1000, litres: 1000,
};

function parseNumber(word) {
  if (word in WORD_NUMBERS) return WORD_NUMBERS[word];
  const frac = word.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  const num = word.replace(",", ".");
  if (/^\d*\.?\d+$/.test(num)) return parseFloat(num);
  return null;
}

// -------------------------------------------------- découpage d'une ligne

/**
 * "150 g de poulet" -> { qty: 150, unit: "g", size: 1, name: "poulet" }
 */
function parseQuantity(raw) {
  let words = normalize(raw).split(" ").filter(Boolean);
  let qty = null;
  let unit = null;
  let size = 1;

  // "80g" collé -> "80 g"
  const expanded = [];
  for (const w of words) {
    const m = w.match(/^(\d+[.,]?\d*)(g|gr|kg|ml|cl|dl|l|grammes?)$/);
    if (m) expanded.push(m[1], m[2]);
    else expanded.push(w);
  }
  words = expanded;

  // quantité en tête
  if (words.length) {
    const n = parseNumber(words[0]);
    if (n !== null) {
      qty = n;
      words.shift();
      // "1 demi" / "2 x"
      if (words[0] === "x") words.shift();
      if (words[0] && WORD_NUMBERS[words[0]] === 0.5) {
        qty += 0.5;
        words.shift();
      }
    }
  }

  // unité de masse / volume
  if (words.length && words[0] in MASS_UNITS) {
    unit = words[0];
    words.shift();
  } else {
    // unité de portion, éventuellement en deux/trois mots
    for (const len of [3, 2, 1]) {
      if (words.length < len) continue;
      const cand = words.slice(0, len).join(" ");
      const key = PORTION_ALIASES[cand] || cand;
      if (key in PORTIONS) {
        unit = key;
        words.splice(0, len);
        break;
      }
    }
  }

  // quantité écrite après l'aliment : "poulet 150g", "lait 20 cl", "cafe x2"
  if (qty === null && words.length >= 2) {
    const last = words[words.length - 1];
    const prev = words[words.length - 2];
    const xMatch = last.match(/^[x*](\d+)$/);
    if (last in MASS_UNITS && parseNumber(prev) !== null) {
      qty = parseNumber(prev);
      unit = last;
      words.splice(-2, 2);
    } else if (xMatch) {
      qty = parseInt(xMatch[1], 10);
      words.pop();
    } else {
      // "3 oeufs" écrit "oeufs 3" : petit nombre nu, seulement si ça reste un nom
      const n = parseNumber(last);
      if (n !== null && n <= 20 && words.length > 1) {
        qty = n;
        words.pop();
      }
    }
  }

  // taille (avant ou après le nom : "grande frites", "frites grande")
  if (words.length > 1 && words[0] in SIZES) {
    size = SIZES[words[0]];
    words.shift();
  } else if (words.length > 1 && words[words.length - 1] in SIZES) {
    size = SIZES[words[words.length - 1]];
    words.pop();
  }

  // "de", "d'", "du"... en tête du nom
  while (words.length && ["de", "du", "des", "d", "a", "au"].includes(words[0])) {
    words.shift();
  }

  return { qty, unit, size, name: words.join(" ").trim() };
}

// -------------------------------------------------------- reconnaissance

/**
 * Score de ressemblance entre la saisie et un alias (0 -> 100).
 */
function scoreAlias(queryNorm, queryTokens, alias) {
  const aNorm = normalize(alias);
  if (!aNorm) return 0;
  if (aNorm === queryNorm) return 100;

  const aTokens = tokens(alias);
  if (!aTokens.length || !queryTokens.length) return 0;
  if (aTokens.join(" ") === queryTokens.join(" ")) return 98;

  let score = 0;

  if (aNorm.startsWith(queryNorm) || queryNorm.startsWith(aNorm)) {
    score = Math.max(score, 90 - Math.abs(aNorm.length - queryNorm.length));
  }
  if (aNorm.includes(queryNorm) || queryNorm.includes(aNorm)) {
    score = Math.max(score, 78 - Math.abs(aNorm.length - queryNorm.length));
  }

  // recouvrement de mots
  const inter = aTokens.filter((t) => queryTokens.includes(t)).length;
  if (inter) {
    const cover = inter / Math.max(aTokens.length, queryTokens.length);
    score = Math.max(score, 45 + cover * 45);
  }

  // tolérance aux fautes de frappe
  const dist = levenshtein(queryNorm, aNorm);
  const sim = 1 - dist / Math.max(queryNorm.length, aNorm.length);
  if (sim > 0.7) score = Math.max(score, sim * 82);

  return score;
}

/**
 * Cherche les meilleurs aliments correspondant à `name`.
 * `extra` = aliments personnels de l'utilisateur (même format que FOODS).
 */
function searchFoods(name, extra = [], limit = 5) {
  const queryNorm = normalize(name);
  if (!queryNorm) return [];
  const queryTokens = tokens(name);
  const all = extra.concat(FOOD_DB);

  const scored = [];
  for (const food of all) {
    const aliases = [food.n].concat(food.a || []);
    let best = 0;
    for (const alias of aliases) {
      const s = scoreAlias(queryNorm, queryTokens, alias);
      if (s > best) best = s;
    }
    if (food.custom) best += 6;  // priorité aux aliments appris
    if (best >= 48) scored.push({ food, score: best });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// ---------------------------------------------------------- quantification

/**
 * Combien de grammes représente { qty, unit, size } pour cet aliment ?
 */
function gramsFor(food, qty, unit, size = 1) {
  const per = food.po || {};
  let grams;
  let label;

  if (unit && unit in MASS_UNITS) {
    const n = qty === null ? 100 : qty;
    grams = n * MASS_UNITS[unit];
    label = `${round(n)} ${unit}`;
  } else if (unit) {
    const w = per[unit] || PORTIONS[unit] || 100;
    const n = qty === null ? 1 : qty;
    grams = n * w;
    label = `${fmtQty(n)} ${unit}`;
  } else if (qty !== null) {
    if (food.u) {
      grams = qty * food.u;
      label = `${fmtQty(qty)} ×`;
    } else {
      const base = food.s || 100;
      grams = qty * base;
      label = `${fmtQty(qty)} portion${qty > 1 ? "s" : ""}`;
    }
  } else {
    grams = food.s || food.u || 100;
    label = "1 portion";
  }

  grams *= size;
  return { grams, label };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function fmtQty(n) {
  if (n === 0.5) return "½";
  if (n === 0.25) return "¼";
  if (n === 1.5) return "1½";
  return String(round(n));
}

// ------------------------------------------------------------ point d'entrée

/**
 * Découpe le texte libre en items séparés (virgules, "+", retours à la ligne...).
 */
function splitItems(text) {
  return text
    .replace(/\r/g, "")
    .split(/\n|,|;|\s\+\s|\+|\bet\b|\bavec\b|&/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Analyse complète : renvoie une ligne par aliment détecté.
 * Chaque ligne : { raw, name, food, grams, kcal, prot, matches, confidence }
 */
function parseMeal(text, extra = []) {
  const results = [];
  for (const raw of splitItems(text)) {
    // on ignore les intitulés de repas seuls
    if (/^(petit dej(euner)?|dej(euner)?|dejeuner|diner|souper|gouter|collation|repas|snack|midi|soir|matin)\s*:?$/i.test(raw.trim())) {
      continue;
    }
    const cleaned = raw.replace(/^(petit dej(euner)?|dej(euner)?|diner|gouter|collation|repas|snack)\s*:\s*/i, "");
    const { qty, unit, size, name } = parseQuantity(cleaned);
    if (!name) continue;

    const matches = searchFoods(name, extra);
    if (!matches.length) {
      results.push({
        raw: cleaned.trim(), name, qty, unit, size,
        food: null, grams: null, kcal: null, prot: 0,
        matches: [], confidence: 0, unknown: true,
      });
      continue;
    }

    const food = matches[0].food;
    const { grams, label } = gramsFor(food, qty, unit, size);
    results.push({
      raw: cleaned.trim(), name, qty, unit, size,
      food,
      grams: Math.round(grams),
      qtyLabel: label,
      kcal: Math.round((grams * food.k) / 100),
      prot: Math.round((grams * (food.p || 0)) / 100),
      matches: matches.map((m) => m.food),
      confidence: matches[0].score,
      unknown: false,
    });
  }
  return results;
}

const Parser = {
  normalize, tokens, parseQuantity, searchFoods, gramsFor,
  parseMeal, splitItems, PORTIONS, MASS_UNITS, fmtQty,
};

if (typeof window !== "undefined") window.Parser = Parser;
if (typeof module !== "undefined") module.exports = Parser;
