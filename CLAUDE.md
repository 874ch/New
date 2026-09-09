# Conventions du projet

Site e-commerce de claviers mécaniques custom : catalogue de claviers tout
faits + configurateur 3D avec placement libre touche par touche.
`ARCHITECTURE.md` fait référence pour tous les choix techniques.

## Communication

- **Réponds toujours en français**, dans tous les messages, quelle que soit la
  langue de la question.
- Le code, les commentaires, les commits et la documentation sont également en
  français, hors identifiants techniques usuels (`unitPriceCents`, `layoutSlug`…).

## Découpage en phases

Le projet suit les phases du brief, chacune associée à un modèle précis.
**Quand le modèle change entre deux phases, s'arrêter, annoncer la fin de la
phase et attendre le changement de modèle avant de continuer.** Ne jamais
sauter une phase. En cas d'ambiguïté au moment d'attaquer une phase, poser la
question plutôt que de supposer.

État d'avancement et répartition des modèles : `ARCHITECTURE.md` §14.

## Règles non négociables

- **L'argent est un entier.** Montants en centimes (`Int`) partout. La division
  par 100 n'existe que dans `formatPriceCents()`.
- **Le prix payé est recalculé côté serveur** à partir du build, depuis la
  table de prix en base. Aucun montant venant du client n'est jamais utilisé.
- **Le prix est une addition pure** : somme des (prix unitaire × quantité
  posée). Pas de palier, pas de base + delta, pas de remise automatique.
- **Le cas canonique à 305 €** (`src/lib/pricing/computeBuildPrice.test.ts`)
  doit rester vert. S'il casse, le moteur de prix est faux.
- **En 3D, une touche n'est jamais un objet.** `InstancedMesh` obligatoire pour
  les keycaps et les switches, couleur par instance. Le JSX ne parcourt jamais
  la liste des touches. Voir `ARCHITECTURE.md` §9.3.

## Commandes

```sh
npm test          # tests unitaires (Vitest)
npm run typecheck # tsc --noEmit
```
