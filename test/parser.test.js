/*
 * Tests du parseur — aucune dépendance : `node test/parser.test.js`
 */
const assert = require("assert");
const P = require("../js/parser.js");

let passed = 0;
const cases = [];

/** Vérifie qu'une phrase donne les bons aliments et un total plausible. */
function check(text, expected) {
  cases.push(() => {
    const items = P.parseMeal(text);
    const names = items.map((i) => (i.unknown ? "?" : i.food.n));
    const total = items.reduce((s, i) => s + (i.kcal || 0), 0);

    if (expected.names) {
      assert.deepStrictEqual(names, expected.names, `${text}\n  → ${names.join(", ")}`);
    }
    if (expected.grams) {
      const grams = items.map((i) => i.grams);
      assert.deepStrictEqual(grams, expected.grams, `${text}\n  → ${grams.join(", ")}`);
    }
    if (expected.kcal) {
      const [lo, hi] = expected.kcal;
      assert.ok(total >= lo && total <= hi, `${text}\n  → ${total} kcal, attendu ${lo}-${hi}`);
    }
    passed++;
  });
}

// --------------------------------------------------------------- quantités
check("2 oeufs", { names: ["Œuf"], grams: [110] });
check("80g de riz", { names: ["Riz cuit"], grams: [80] });
check("80 g de riz", { grams: [80] });
check("riz 80g", { grams: [80] });          // quantité après l'aliment
check("20cl de lait", { grams: [200] });
check("1/2 avocat", { grams: [65] });
check("demi baguette", { grams: [125] });
check("3 tranches de jambon", { grams: [120] });
check("2 c à s d'huile d'olive", { grams: [20] });
check("poignée d'amandes", { grams: [30] });
check("une canette de coca", { grams: [330] });
check("café x2", { grams: [200] });
check("2 carrés de chocolat noir", { grams: [20] });

// ---------------------------------------------------------------- découpage
check("2 oeufs, 80g de riz, une pomme", { names: ["Œuf", "Riz cuit", "Pomme"] });
check("poulet et riz", { names: ["Blanc de poulet", "Riz cuit"] });
check("60g flocons d'avoine + 200ml lait demi écrémé", {
  names: ["Flocons d'avoine", "Lait demi-écrémé"], grams: [60, 200],
});
check("petit dej: 1 banane", { names: ["Banane"] });

// ------------------------------------------------------------ tolérance
check("poulé", { names: ["Blanc de poulet"] });        // accent/faute
check("pates carbo", { names: ["Pâtes carbonara"] });
check("BIG MAC", { names: ["Big Mac"] });
check("blblblb", { names: ["?"] });                    // inconnu -> à saisir

// --------------------------------------------------- ordres de grandeur
check("big mac", { kcal: [520, 580] });
check("kebab", { kcal: [700, 850] });
check("150g de poulet", { kcal: [230, 260] });
check("1 pomme", { kcal: [80, 110] });
check("100g d'huile d'olive", { kcal: [880, 920] });
check("coca zero", { kcal: [0, 5] });

// ----------------------------------------------------- aliments appris
cases.push(() => {
  const mine = [{ n: "Bowl du resto", k: 200, p: 10, s: 400, custom: true, a: ["bowl du resto"] }];
  const [item] = P.parseMeal("bowl du resto", mine);
  assert.strictEqual(item.food.n, "Bowl du resto");
  assert.strictEqual(item.kcal, 800);
  passed++;
});

// ------------------------------------------------------------------- run
let failed = 0;
for (const run of cases) {
  try {
    run();
  } catch (e) {
    failed++;
    console.error("✗ " + e.message);
  }
}

console.log(`\n${passed}/${cases.length} tests OK`);
process.exit(failed ? 1 : 0);
