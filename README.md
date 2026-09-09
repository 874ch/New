# Claviers custom

Site e-commerce de claviers mécaniques, entièrement sur mesure — sans Shopify
ni aucune plateforme tierce.

Deux façons d'acheter :

- un **catalogue** de claviers tout faits, à variantes fixes ;
- un **configurateur 3D** où le clavier se construit pièce par pièce, avec
  placement libre touche par touche des switches et des keycaps.

## État

**Phase 0 terminée** — architecture arrêtée et moteur de prix opérationnel.
Le reste du site n'est pas encore développé.

Voir [`ARCHITECTURE.md`](./ARCHITECTURE.md) pour les décisions techniques et
[`ARCHITECTURE.md` §14](./ARCHITECTURE.md#14-phases-et-points-darrêt) pour
l'avancement.

## Modèle de prix

Le prix d'un build est une **addition pure** : la somme des prix unitaires de
chaque pièce, multipliés par le nombre de fois qu'elle est posée. Pas de
palier, pas de base + delta, pas de remise automatique.

Tout est calculé en centimes entiers : `0.7 * 50` vaut `34.999999999999996` en
flottant, `70 * 50` vaut `3500`.

Le build de référence :

| Pièce                    | Prix unitaire | Quantité |        Total |
| ------------------------ | ------------: | -------: | -----------: |
| Châssis blanc            |      110,00 € |        1 |     110,00 € |
| Switch Outemu Peach V3   |        2,00 € |       50 |     100,00 € |
| Switch KTT Kang White V3 |        1,50 € |       30 |      45,00 € |
| Keycap blanche           |        0,70 € |       50 |      35,00 € |
| Keycap noire             |        0,50 € |       30 |      15,00 € |
|                          |               |          | **305,00 €** |

Le prix affiché pendant la configuration n'est qu'indicatif : le montant
facturé est toujours recalculé côté serveur à partir du build complet et de la
table de prix en base.

## Développement

```sh
npm install
npm test          # tests du moteur de prix, dont le cas à 305 €
npm run typecheck
```

## Stack

Next.js (App Router) · TypeScript · Tailwind · react-three-fiber + drei ·
PostgreSQL + Prisma · Stripe Checkout
