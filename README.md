# Kcal

Suivi de calories sans friction : tu écris ce que tu manges en langage normal,
l'app calcule et t'affiche ce qu'il te reste pour la journée.

```
2 œufs, 80 g de riz, une pomme     →  358 kcal
```

Pas de scan de code-barres, pas de repas à créer, pas de compte.
Une seule zone de texte et un gros chiffre.

## Installer sur ton téléphone

L'app est une PWA : elle s'installe depuis le navigateur, sans passer par un store.

**1. Publier la page** (une seule fois)

Sur GitHub : `Settings` → `Pages` → *Build and deployment* → Source **Deploy from a branch**,
branche `claude/calorie-tracking-app-2wlx44`, dossier `/ (root)` → `Save`.

Au bout d'une minute l'app est en ligne sur :
`https://874ch.github.io/New/`

**2. L'ajouter à l'écran d'accueil**

- **iPhone** — ouvrir le lien dans **Safari** (pas Chrome), bouton Partager → *Sur l'écran d'accueil*.
- **Android** — ouvrir dans Chrome, menu ⋮ → *Installer l'application*.

Elle se lance alors en plein écran, sans barre de navigateur, et **fonctionne hors-ligne**.

## Utilisation

Tu écris, tu valides. C'est tout.

| Tu tapes | Ce que ça fait |
|---|---|
| `2 œufs, 80g de riz, une pomme` | trois lignes d'un coup |
| `poulet 180g` ou `180g de poulet` | la quantité peut être avant ou après |
| `3 tranches de jambon` | portions : tranche, part, bol, assiette, verre, poignée, cas, cac, canette… |
| `un yaourt grec + poignée d'amandes` | séparateurs : virgule, `+`, `et`, retour à la ligne |
| `1/2 avocat`, `demi baguette` | fractions |
| `grande frites` | tailles : petit / moyen / grand / maxi |
| `20 cl de lait`, `1,5 kg` | g, kg, ml, cl, l |
| `poulé` | fautes de frappe et accents tolérés |

Sans quantité précisée, l'app prend une portion courante (`kebab` → 350 g).

**Ce qu'elle ne connaît pas**, elle le demande : la ligne s'affiche en orange avec un
champ « kcal ». Tu donnes le chiffre une fois, elle le retient pour toujours — au bout
de quelques jours elle connaît tout ce que tu manges.

Autres gestes utiles :

- **taper sur une ligne** → corriger la quantité, changer d'aliment, supprimer ;
- **puces sous la saisie** → tes aliments les plus fréquents, en un tap ;
- **flèches en haut** → jours précédents/suivants (le titre ramène à aujourd'hui) ;
- **« Copier la veille »** quand la journée est vide.

## Objectifs

Réglés par défaut sur :

- **2140 kcal/jour jusqu'au 17/08/2026 inclus**
- **2275 kcal/jour** à partir du 18/08/2026

Modifiables dans les réglages (roue dentée), avec la date de bascule.

## Données

Tout reste dans le `localStorage` du téléphone : rien n'est envoyé nulle part, aucun compte.
Revers de la médaille, effacer les données du navigateur efface l'historique — d'où
l'export/import JSON dans les réglages pour faire une sauvegarde.

## Sous le capot

Aucune dépendance, aucune étape de build : trois fichiers JS servis tels quels.

| Fichier | Rôle |
|---|---|
| `js/foods.js` | ~270 aliments (kcal et protéines /100 g, poids unitaires, portions) |
| `js/parser.js` | quantités, unités, découpage de la phrase, recherche floue |
| `js/app.js` | état, rendu, stockage local |
| `sw.js` | cache hors-ligne |

Les valeurs nutritionnelles sont des ordres de grandeur (type Ciqual) : suffisant pour
suivre une tendance, pas pour de la diététique au gramme près.

Tests du parseur :

```sh
node test/parser.test.js
```

### Ajouter un aliment à la base

Le plus simple est de laisser l'app apprendre (ligne orange → tu tapes les kcal).
Pour l'ajouter en dur, une ligne dans `js/foods.js` :

```js
{ n: "Nom affiché", k: 165, p: 31, u: 120, s: 150,
  po: { tranche: 30 }, a: ["autre nom", "abréviation"] },
```

`k` kcal/100 g · `p` protéines/100 g · `u` poids d'une unité · `s` portion par défaut ·
`po` poids des portions · `a` alias.
