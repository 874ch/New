# ARCHITECTURE

Document de référence du site e-commerce de claviers mécaniques custom.
Il tranche les choix structurants de la **Phase 0** et sert de contrat pour
toutes les phases suivantes. Toute décision qui s'avère intenable en cours de
route doit être remontée ici explicitement, pas contournée en silence.

- **Statut** : Phase 0 terminée, décisions arrêtées sauf mention contraire
- **Code déjà écrit à ce stade** : `src/lib/pricing/` (moteur de prix + tests)
- **Questions encore ouvertes** : §13

---

## 1. Principes directeurs

Cinq règles qui expliquent la plupart des décisions du document.

1. **L'argent est un entier.** Tous les montants sont stockés, transportés et
   calculés en **centimes d'euro, en `Int`**. Aucun flottant, aucun `Decimal`
   au-dessus de la couche d'affichage. La division par 100 n'existe que dans
   `formatPriceCents()`.
2. **Le prix payé vient toujours du serveur.** Le client peut afficher ce
   qu'il veut ; le montant envoyé à Stripe est recalculé depuis la base à
   partir du build, jamais lu dans la requête.
3. **Une commande est un instantané figé.** Le catalogue évolue, les prix
   changent : une commande passée doit rester lisible et fabricable dix-huit
   mois plus tard. D'où le `snapshot` JSON immuable sur chaque ligne.
4. **Le SKU est l'identifiant de fil.** Les échanges client↔serveur et les
   snapshots utilisent des SKU lisibles (`SW-OUTEMU-PEACH-V3`), pas des
   identifiants de base. Debuggable, stable entre environnements, lisible par
   la personne qui assemble le clavier.
5. **En 3D, une touche n'est pas un objet.** 80 touches = 80 entrées dans
   quelques `InstancedMesh`, jamais 80 composants React ni 80 meshes. Cette
   règle conditionne toute la Phase 4.

---

## 2. Stack

| Domaine            | Retenu                                                           | Écarté, et pourquoi                                                                                                              |
| ------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Next.js 15+, App Router, TypeScript strict**                   | — (contrainte du brief)                                                                                                          |
| Style              | **Tailwind CSS** + tokens CSS                                    | — (contrainte du brief)                                                                                                          |
| 3D                 | **react-three-fiber + drei**, assets dérivés via **img2threejs** | — (contrainte du brief)                                                                                                          |
| Base               | **PostgreSQL** (Neon ou Supabase)                                | SQLite : pas de concurrence sérieuse sur un flux de paiement. MongoDB : les commandes sont fortement relationnelles              |
| ORM                | **Prisma**                                                       | Drizzle : plus proche du SQL mais typage des relations moins confortable pour la vue admin ; le brief recommande Prisma, on suit |
| Paiement           | **Stripe Checkout** (hébergé)                                    | Payment Element : plus joli, mais SCA/3DS, Apple/Google Pay et PCI SAQ-A gratuits avec Checkout. Voir §6.3                       |
| État configurateur | **Zustand** + persistance `localStorage`                         | Redux : trop lourd ; Context React : re-render de tout l'arbre à chaque touche peinte, rédhibitoire ici                          |
| Validation         | **Zod** aux frontières d'API                                     | —                                                                                                                                |
| Tests              | **Vitest** (unitaire), Playwright en Phase 7                     | —                                                                                                                                |
| Hébergement        | **Vercel** + Postgres managé                                     | —                                                                                                                                |

**Prisma en serverless** : chaque lambda ouvre sa connexion. Il faut une chaîne
**poolée** (PgBouncer / pooler Neon) dans `DATABASE_URL`, et la chaîne directe
dans `DIRECT_URL` pour les migrations. Oublier ce point sature Postgres dès les
premières dizaines de visiteurs simultanés.

---

## 3. Modèle de données

### 3.1 Catalogue

Une seule table `Component` pour toutes les pièces, avec un discriminant
`kind`. C'est ce qui rend le moteur de prix trivial : quel que soit le type de
pièce, le prix est `unitPriceCents`, et le total est une somme.

`layoutId` n'est renseigné que pour les châssis : c'est le châssis qui impose
le layout, donc le nombre de positions à remplir.

### 3.2 Layouts et positions de touches

`Layout` décrit un format (ex. « Compact 80 »), `LayoutKey` décrit **une
position physique** : son code stable, son libellé, ses coordonnées en unités
`U` et sa largeur. Ces coordonnées servent trois choses à la fois :

- calculer les matrices d'instance en 3D (Phase 4) ;
- dessiner la vue de dessus 2D (repli WebGL et assistance tactile, Phase 7) ;
- imprimer le plan de montage dans le back-office (§8).

`LayoutKey.code` est **le** point de jonction entre la 3D, l'état Zustand, le
JSON envoyé au serveur et la fiche de fabrication. Il ne change jamais.

### 3.3 Builds

**Décision : la base ne stocke que des builds complets et valides.** Une
configuration en cours de construction vit côté client (Zustand + `localStorage`).
Le serveur ne crée un `Build` qu'au moment de l'ajout au panier, après
validation de complétude. Conséquence : `BuildAssignment.switchId` et
`.keycapId` sont non-nullables, et aucun code n'a à gérer un demi-build en base.

**Décision : les assignations sont relationnelles, pas un blob JSON.** Une
ligne par touche (80 lignes pour un build). Coût : négligeable. Bénéfice : la
nomenclature de fabrication du back-office est un `GROUP BY` au lieu d'un
parcours JSON en mémoire, et l'intégrité référentielle vers `Component` est
garantie par la base.

Le blob JSON existe quand même — mais sur la **commande** (§3.5), comme
instantané figé.

### 3.4 Panier

Panier serveur, identifié par un token dans un cookie `httpOnly`. **Aucun prix
n'est stocké dans le panier** : il est systématiquement relu du catalogue.
C'est la propriété qui rend impossible un panier « empoisonné ».

Pas de compte client au lancement (paiement invité) — voir §13.

### 3.5 Commandes

`Order` porte le total, l'adresse, le statut et les références Stripe.
`OrderItem` porte, en plus des montants figés, un `snapshot: Json` qui contient
**tout ce qu'il faut pour fabriquer sans requêter le catalogue** :

```jsonc
{
  "label": "Clavier custom — Compact 80",
  "layout": { "slug": "compact-80", "name": "Compact 80", "keyCount": 80 },
  "chassis": { "sku": "CHS-BLANC", "name": "Châssis blanc", "unitPriceCents": 11000 },
  "bom": [
    {
      "sku": "SW-OUTEMU-PEACH-V3",
      "name": "Outemu Peach V3",
      "unitPriceCents": 200,
      "quantity": 50,
      "lineTotalCents": 10000,
    },
    // …
  ],
  "keys": {
    "K01": { "switch": "SW-OUTEMU-PEACH-V3", "keycap": "KC-BLANC" },
    // … 80 entrées
  },
  "totalCents": 30500,
}
```

`bom` est exactement le `lines` renvoyé par `computeBuildPrice()` : le détail
affiché au client, le montant facturé et la liste de picking de l'atelier sont
le même objet. Une seule source, pas trois formats à resynchroniser.

### 3.6 Schéma Prisma

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // chaîne poolée
  directUrl = env("DIRECT_URL")     // chaîne directe, pour les migrations
}

generator client {
  provider = "prisma-client-js"
}

// ─────────────────────────── Catalogue ───────────────────────────

enum ComponentKind {
  CHASSIS
  SWITCH
  KEYCAP
  CABLE
  ACCESSORY
}

model Component {
  id             String        @id @default(cuid())
  sku            String        @unique          // identifiant de fil, stable
  kind           ComponentKind
  name           String
  slug           String        @unique
  description    String?
  unitPriceCents Int                            // TTC, source de vérité du prix
  active         Boolean       @default(true)
  sortOrder      Int           @default(0)
  stockQty       Int?                           // indicatif, jamais bloquant (§7)

  swatchHex      String?                        // pastille dans la palette
  render         Json?                          // { color, roughness, metalness, meshKey }

  layoutId       String?                        // CHASSIS uniquement
  layout         Layout?       @relation(fields: [layoutId], references: [id])

  buildsAsChassis   Build[]           @relation("BuildChassis")
  switchAssignments BuildAssignment[] @relation("AssignmentSwitch")
  keycapAssignments BuildAssignment[] @relation("AssignmentKeycap")
  buildExtras       BuildExtra[]

  @@index([kind, active, sortOrder])
}

// ──────────────────────────── Layouts ────────────────────────────

model Layout {
  id       String      @id @default(cuid())
  slug     String      @unique                  // "compact-80"
  name     String                               // "Compact 80"
  keyCount Int                                  // = keys.length, vérifié au seed
  widthU   Float                                // encombrement, pour la vue 2D
  heightU  Float

  keys    LayoutKey[]
  chassis Component[]
  builds  Build[]
}

model LayoutKey {
  id       String @id @default(cuid())
  layoutId String
  layout   Layout @relation(fields: [layoutId], references: [id], onDelete: Cascade)

  code    String                                // "K01" — jonction 3D / état / commande
  label   String                                // "Échap", "A", "Espace"
  row     Int
  col     Int
  x       Float                                 // en U depuis le coin haut-gauche
  y       Float
  widthU  Float  @default(1)
  heightU Float  @default(1)

  assignments BuildAssignment[]

  @@unique([layoutId, code])
  @@index([layoutId])
}

// ───────────────────────────── Builds ────────────────────────────

model Build {
  id        String @id @default(cuid())
  layoutId  String
  layout    Layout @relation(fields: [layoutId], references: [id])
  chassisId String
  chassis   Component @relation("BuildChassis", fields: [chassisId], references: [id])

  totalCents Int                                // toujours issu du recalcul serveur

  assignments BuildAssignment[]
  extras      BuildExtra[]
  cartItems   CartItem[]
  orderItems  OrderItem[]

  createdAt DateTime @default(now())
}

model BuildAssignment {
  id      String @id @default(cuid())
  buildId String
  build   Build  @relation(fields: [buildId], references: [id], onDelete: Cascade)

  layoutKeyId String
  layoutKey   LayoutKey @relation(fields: [layoutKeyId], references: [id])
  keyCode     String                            // dupliqué : lecture directe en atelier

  switchId String
  switch   Component @relation("AssignmentSwitch", fields: [switchId], references: [id])
  keycapId String
  keycap   Component @relation("AssignmentKeycap", fields: [keycapId], references: [id])

  @@unique([buildId, keyCode])
  @@index([buildId])
}

model BuildExtra {
  id          String    @id @default(cuid())
  buildId     String
  build       Build     @relation(fields: [buildId], references: [id], onDelete: Cascade)
  componentId String
  component   Component @relation(fields: [componentId], references: [id])
  quantity    Int

  @@unique([buildId, componentId])
}

// ────────────────────── Claviers tout faits ──────────────────────

model Product {
  id          String  @id @default(cuid())
  slug        String  @unique
  name        String
  description String
  images      Json                              // string[]
  active      Boolean @default(true)
  sortOrder   Int     @default(0)

  variants ProductVariant[]
}

model ProductVariant {
  id             String  @id @default(cuid())
  productId      String
  product        Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku            String  @unique
  name           String                         // "Noir / Outemu Peach V3"
  unitPriceCents Int                            // prix catalogue, fait foi (§4.7)
  stockQty       Int?
  active         Boolean @default(true)

  buildTemplate Json?                           // recette d'assemblage, même forme que Build

  cartItems  CartItem[]
  orderItems OrderItem[]
}

// ───────────────────────────── Panier ────────────────────────────

enum LineKind {
  STANDARD
  CUSTOM_BUILD
}

model Cart {
  id    String     @id @default(cuid())
  token String     @unique                      // valeur du cookie httpOnly
  items CartItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  expiresAt DateTime
}

model CartItem {
  id     String @id @default(cuid())
  cartId String
  cart   Cart   @relation(fields: [cartId], references: [id], onDelete: Cascade)

  kind     LineKind
  quantity Int      @default(1)

  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  buildId   String?
  build     Build?          @relation(fields: [buildId], references: [id])
  // Volontairement aucun champ de prix ici.

  @@index([cartId])
}

// ──────────────────────────── Commandes ──────────────────────────

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  IN_PRODUCTION
  SHIPPED
  DELIVERED
  PAYMENT_FAILED
  EXPIRED
  CANCELLED
  REFUNDED
}

model Order {
  id     String      @id @default(cuid())
  number String      @unique                    // "KB-2026-000042"
  status OrderStatus @default(PENDING_PAYMENT)

  email           String
  phone           String?
  shippingAddress Json
  billingAddress  Json?

  subtotalCents Int
  shippingCents Int    @default(0)
  totalCents    Int
  vatRateBp     Int    @default(2000)           // 20,00 % en points de base
  vatCents      Int                             // TVA incluse dans totalCents
  currency      String @default("EUR")

  stripeCheckoutSessionId String?   @unique
  stripePaymentIntentId   String?   @unique
  paidAt                  DateTime?

  trackingCarrier String?
  trackingNumber  String?
  adminNotes      String?

  items OrderItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status, createdAt])
}

model OrderItem {
  id      String @id @default(cuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  kind           LineKind
  quantity       Int
  unitPriceCents Int                            // figé au moment de la commande
  lineTotalCents Int

  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  buildId   String?
  build     Build?          @relation(fields: [buildId], references: [id])

  snapshot Json                                 // instantané immuable, cf. §3.5
}

// ────────────────────── Infrastructure / admin ───────────────────

model ProcessedStripeEvent {
  id          String   @id                      // "evt_…" — garantit l'idempotence
  type        String
  processedAt DateTime @default(now())
}

model AdminUser {
  id           String         @id @default(cuid())
  email        String         @unique
  passwordHash String                           // argon2id
  createdAt    DateTime       @default(now())
  sessions     AdminSession[]
}

model AdminSession {
  id        String    @id @default(cuid())
  tokenHash String    @unique                   // le token brut ne vit que dans le cookie
  userId    String
  user      AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
}
```

---

## 4. Moteur de prix

Implémenté et testé dès cette phase : `src/lib/pricing/`.

### 4.1 La règle

```
total = Σ (prix unitaire de la pièce × nombre de fois qu'elle est posée)
```

Pas de palier, pas de base + delta, pas de remise automatique. Le châssis
compte pour 1, chaque touche assignée compte pour 1 switch et 1 keycap, chaque
extra compte pour sa quantité.

### 4.2 Pourquoi des centimes entiers

`0.7 * 50` vaut `34.999999999999996` en flottant IEEE-754. Sur les 80 keycaps
et 80 switches d'un build, ces dérives s'accumulent et le total affiché finit
par différer du total facturé d'un centime — un écart minuscule mais qui
provoque un litige et un rapprochement comptable faux. `70 * 50` vaut `3500`.
Un test dédié verrouille ce point.

### 4.3 API

```ts
computeBuildPrice(build: Build, priceTable: PriceTable): PriceBreakdown
```

Fonction **pure**, sans dépendance à Prisma ni à React : le même code tourne
dans le navigateur et sur le serveur. Seule la provenance de `priceTable`
diffère — API publique côté client, base de données côté serveur.

`PriceTable` est une `Map` et non un objet simple : les SKU viennent du client,
et sur un objet `table['__proto__']` renverrait `Object.prototype` au lieu de
`undefined`, ce qui contournerait le contrôle de référence inconnue. Un test
couvre ce cas.

`PriceBreakdown.lines` est trié de façon déterministe (châssis → switches →
keycaps → reste, puis quantité décroissante, puis SKU) : le même build produit
le même détail partout, ce qui permet de comparer client et serveur octet à
octet en cas de litige.

### 4.4 Build partiel

Un build dont des touches sont encore vides est **chiffrable** : c'est ce qui
alimente le prix affiché en direct pendant que le client peint ses touches. La
complétude est une validation séparée (§5), pas une condition de calcul.

### 4.5 Le cas de test canonique

`src/lib/pricing/computeBuildPrice.test.ts` — 16 tests, dont le build de
référence du brief :

| Pièce             |       PU | Qté |        Total |
| ----------------- | -------: | --: | -----------: |
| Châssis blanc     | 110,00 € |   1 |     110,00 € |
| Outemu Peach V3   |   2,00 € |  50 |     100,00 € |
| KTT Kang White V3 |   1,50 € |  30 |      45,00 € |
| Keycap blanche    |   0,70 € |  50 |      35,00 € |
| Keycap noire      |   0,50 € |  30 |      15,00 € |
|                   |          |     | **305,00 €** |

```sh
npm test
```

Les autres tests verrouillent : l'absence de remise sur quantité, le châssis
noir qui retire exactement 10 € (donc pas de base + delta caché), l'exactitude
sur `0,70 € × 50`, le chiffrage partiel, les extras, et les garde-fous du §4.6.

### 4.6 Garde-fous sur un build reçu du client

Le moteur lève une erreur typée plutôt que d'ignorer silencieusement :

| Erreur                    | Cas                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `UnknownSkuError`         | SKU absent du catalogue — catalogue périmé côté client, ou tentative de fraude      |
| `WrongComponentKindError` | pièce posée dans un mauvais emplacement (une keycap à 0,50 € déclarée comme switch) |
| `InvalidQuantityError`    | quantité d'extra non entière, nulle ou négative                                     |

Ignorer une pièce inconnue reviendrait à la facturer 0 €. Ces erreurs se
traduisent en `400` à la frontière d'API, sans jamais atteindre Stripe.

### 4.7 Prix des claviers tout faits

**Le calcul par addition s'applique aux builds du configurateur.** Un clavier
tout fait a un prix catalogue propre (`ProductVariant.unitPriceCents`), qui
n'est pas nécessairement la somme de ses pièces — c'est un produit fini, avec
sa marge de montage. À confirmer (§13).

---

## 5. Format de sérialisation du build

Contrat commun au configurateur (Phase 4), au moteur de prix (Phase 5) et à
l'API (Phase 3). Validé par Zod à l'entrée du serveur.

```jsonc
{
  "version": 1,
  "layoutSlug": "compact-80",
  "chassisSku": "CHS-BLANC",
  "keys": {
    "K01": { "switchSku": "SW-OUTEMU-PEACH-V3", "keycapSku": "KC-BLANC" },
    "K02": { "switchSku": "SW-KTT-KANG-WHITE-V3", "keycapSku": "KC-NOIR" },
    "K03": { "switchSku": null, "keycapSku": null }, // toléré en cours de config
  },
  "extras": [{ "sku": "CBL-USBC-TRESSE", "quantity": 1 }],
}
```

`version` permet de faire évoluer le format sans casser les paniers en cours.
Aucun montant ne figure dans ce document : **le client n'envoie jamais de prix.**

Validation serveur avant toute création de commande :

1. le layout existe et le châssis lui correspond ;
2. tous les `keys` sont des codes du layout, sans doublon ni code inconnu ;
3. **toutes** les positions du layout sont présentes et ont un switch **et**
   un keycap (complétude) ;
4. chaque SKU existe, est `active`, et est du bon `kind` ;
5. recalcul du prix, qui devient le montant facturé.

---

## 6. Backend

### 6.1 Décision : Route Handlers Next.js, pas de service séparé

La charge est du CRUD, un appel Stripe et un webhook. Un backend séparé
ajouterait un déploiement, une authentification inter-services, un CORS et une
duplication de types, pour zéro bénéfice à ce stade. On reste dans Next.js
(Route Handlers `app/api/**` + Server Actions pour les mutations liées à l'UI).

**On rouvrira la question si** : besoin de tâches de fond longues (génération
de PDF en masse, rendu 3D serveur), d'un worker planifié, ou d'une API publique
consommée par autre chose que le site.

### 6.2 Endpoints

| Méthode          | Route                                         | Rôle                                                                      |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| `GET`            | `/api/catalog/components`                     | catalogue + prix unitaires (alimente la palette et le prix live)          |
| `GET`            | `/api/catalog/layouts/[slug]`                 | layout + positions de touches                                             |
| `GET`            | `/api/products`, `/api/products/[slug]`       | claviers tout faits                                                       |
| `POST`           | `/api/builds`                                 | valide + recalcule + persiste un build → `{ buildId, totalCents, lines }` |
| `GET`            | `/api/cart`                                   | panier courant, prix relus du catalogue                                   |
| `POST`           | `/api/cart/items`                             | ajout (variante ou build)                                                 |
| `PATCH`/`DELETE` | `/api/cart/items/[id]`                        | quantité / suppression                                                    |
| `POST`           | `/api/checkout`                               | recalcul complet, création de la commande, session Stripe                 |
| `POST`           | `/api/webhooks/stripe`                        | confirmation de paiement (runtime Node, corps brut)                       |
| `GET`            | `/api/admin/orders`, `/api/admin/orders/[id]` | back-office (protégé)                                                     |
| `PATCH`          | `/api/admin/orders/[id]`                      | statut, numéro de suivi                                                   |

### 6.3 Décision : Stripe Checkout plutôt que Payment Element

**Retenu : Checkout hébergé.** Stripe prend en charge SCA/3DS et PSD2 de bout
en bout, le site reste en PCI **SAQ-A** (la charge de conformité la plus
faible), Apple Pay / Google Pay / Link arrivent sans code, et la page de
paiement est maintenue par Stripe.

**Ce qu'on perd** : la page de paiement est hors du site, donc moins maîtrisée
visuellement (personnalisable en couleurs/logo, pas en mise en page).

**Migration ultérieure** : Payment Element s'appuie sur le même `PaymentIntent`.
Le passage n'impacte ni le modèle de données, ni le webhook, ni le recalcul —
seulement la page `/panier`. Le coût de revenir sur cette décision est faible,
ce qui justifie de prendre la voie la plus sûre maintenant.

### 6.4 Flux de paiement

```
Client                     Serveur                        Stripe
  │  POST /api/checkout       │                              │
  │  { email, adresse }       │                              │
  ├──────────────────────────►│                              │
  │                           │ 1. lit le panier en base     │
  │                           │ 2. RECALCULE chaque ligne     │
  │                           │    (computeBuildPrice)        │
  │                           │ 3. crée Order PENDING_PAYMENT │
  │                           │    + OrderItem[] + snapshots  │
  │                           │ 4. checkout.sessions.create   │
  │                           ├─────────────────────────────►│
  │                           │◄─────────────────────────────┤
  │◄──────────────────────────┤   { url }                    │
  │                           │                              │
  │  redirection ──────────────────────────────────────────► │  3DS / SCA
  │                           │                              │
  │                           │◄──── checkout.session.completed
  │                           │  webhook signé               │
  │                           │  5. idempotence (evt id)     │
  │                           │  6. amount_total == total ?  │
  │                           │  7. Order → PAID, panier vidé│
  │                           │  8. e-mail de confirmation   │
  │  ◄─── /commande/confirmation                             │
```

Points non négociables :

- **Le montant envoyé à Stripe vient de l'étape 2**, jamais de la requête.
  Les `line_items` utilisent `price_data.unit_amount` avec le total recalculé.
- **La commande existe avant la redirection**, en `PENDING_PAYMENT`. On ne
  crée jamais une commande depuis la page de retour : le client peut fermer
  son onglet après avoir payé.
- **La page de confirmation lit la commande en base**, pas la session Stripe.
  Si le webhook n'est pas encore arrivé, elle affiche « paiement en cours de
  confirmation » et sonde brièvement — cas fréquent et normal.
- `expires_at` sur la session ; `checkout.session.expired` fait passer la
  commande en `EXPIRED`.

### 6.5 Webhook

- Runtime **Node** obligatoire (`export const runtime = 'nodejs'`) : le SDK
  Stripe ne tourne pas sur l'Edge.
- Signature vérifiée sur le **corps brut** (`await req.text()`), avec
  `STRIPE_WEBHOOK_SECRET`.
- **Idempotence** : insertion de l'`event.id` dans `ProcessedStripeEvent` dans
  la même transaction que la mise à jour de la commande. Une violation de
  contrainte d'unicité signifie « déjà traité » → `200 OK` sans rejouer.
  Stripe réémet les événements, et un double traitement enverrait deux e-mails
  et fausserait le stock.
- **Vérification défensive** : `session.amount_total === order.totalCents`
  avant de passer en `PAID`. Discordance → commande en alerte, pas de
  fabrication lancée.
- Réponse `2xx` rapide ; les tâches lentes (e-mail) après la transaction.

### 6.6 Variables d'environnement

```
DATABASE_URL            # Postgres, chaîne poolée
DIRECT_URL              # Postgres, chaîne directe (migrations)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
ADMIN_SESSION_SECRET    # signature des cookies de session admin
RESEND_API_KEY          # e-mails transactionnels (à confirmer, §13)
```

---

## 7. Décision : gestion du stock

**Retenu : stock indicatif, sans blocage dur au lancement.**

- `Component.stockQty` et `ProductVariant.stockQty` sont nullables et
  décrémentés à la confirmation de paiement.
- L'affichage peut signaler « bientôt épuisé », mais **aucune vente n'est
  bloquée**, et aucune réservation n'est posée pendant le paiement.
- Le back-office affiche les compteurs pour piloter les réapprovisionnements.

**Pourquoi** : c'est le défaut posé par le brief. Sur un atelier qui assemble à
la commande, avec des délais de fabrication de toute façon annoncés, une
rupture ponctuelle se gère par un e-mail au client — bien moins coûteux qu'un
système de réservation avec expiration, qui est une source classique de stock
fantôme (paniers abandonnés qui bloquent des pièces).

**Bascule vers un blocage dur, si nécessaire plus tard** : les champs existent
déjà, donc c'est un ajout, pas une migration de fond. Il faudrait (1) une table
`StockReservation` avec TTL calé sur l'expiration de la session Stripe, (2) un
décrément atomique (`UPDATE … SET stockQty = stockQty - n WHERE stockQty >= n`)
dans la transaction du webhook, (3) une purge des réservations expirées, (4) le
traitement du cas « payé mais rupture entre-temps » (remboursement partiel).
Environ deux jours de travail, à faire seulement si la rupture devient un
problème réel.

---

## 8. Back-office

Sans lui le site n'est pas exploitable : il n'y a aucun moyen de savoir quoi
assembler. Périmètre minimal, livré en Phase 3.

**Authentification** : table `AdminUser` (argon2id) + cookie de session
`httpOnly`, `/admin/**` protégé par middleware. Pas de fournisseur externe pour
deux comptes.

**`/admin/commandes`** — liste : numéro, date, client, montant, statut, filtres
par statut, tri par date.

**`/admin/commandes/[id]`** — la fiche d'atelier, c'est la page qui compte :

1. **En-tête** : client, adresse de livraison, référence de paiement Stripe,
   statut.
2. **Nomenclature de picking** — la sortie de `computeBuildPrice`, agrégée :
   « Châssis blanc ×1 · Outemu Peach V3 ×50 · KTT Kang White V3 ×30 · keycap
   blanche ×50 · keycap noire ×30 ». C'est ce qu'on va chercher dans les bacs.
3. **Plan de montage** — la vue de dessus 2D du layout, chaque touche coloriée
   selon son keycap, avec le switch en légende, plus un tableau
   `code · libellé · switch · keycap` exhaustif. C'est ce qui est posé sur
   l'établi pendant le montage.
4. **Version imprimable** (`@media print`) et export CSV de la nomenclature.
5. **Actions** : changement de statut, saisie transporteur + numéro de suivi.

Tout est lu depuis `OrderItem.snapshot`, jamais depuis le catalogue courant :
une commande de janvier reste fabricable à l'identique après un changement de
prix en mars.

---

## 9. Pipeline des assets 3D

### 9.0 Correction Phase 4 : géométrie procédurale, pas de GLB

> **Le pipeline décrit en 9.1/9.2 n'a pas été appliqué, et ne devrait pas
> l'être en l'état.** Deux constats faits au moment de coder la Phase 4 :
>
> 1. **`img2threejs` n'existe pas** — ni sur le registre npm (404), ni sous un
>    nom approchant. La contrainte du brief était irréalisable telle quelle.
> 2. Aucune référence visuelle ni aucun asset 3D n'a été fourni : il n'y avait
>    de toute façon rien à convertir.
>
> Les pièces sont donc **générées en code** dans
> `src/components/configurator/scene/geometry.ts` (keycap trapézoïdale par
> largeur, boîtier et tige de switch, plaque et cadre du châssis). Pour un
> clavier c'est le meilleur choix, pas un pis-aller : ce sont des formes
> régulières, la géométrie pèse quelques kilo-octets décrits en TypeScript au
> lieu d'un GLB à télécharger et décompresser, l'échelle reste exacte au
> millimètre, et le rétrécissement des keycaps est appliqué en absolu — une
> barre d'espace garde donc les mêmes flancs qu'une touche 1u.
>
> **Conséquence directe : Draco/Meshopt (§9.2) n'a plus d'objet** tant qu'il
> n'y a pas de GLB, et la Phase 6 devra en tenir compte. Le reste du pipeline
> (§9.3, instanciation) s'applique intégralement et a été implémenté.
>
> Passer à de vrais modèles plus tard ne toucherait que `geometry.ts` : les
> `InstancedMesh` acceptent n'importe quelle `BufferGeometry`.

### 9.1 Production des modèles (non appliqué, cf. §9.0)

1. Références visuelles → **img2threejs** pour dériver les maillages de base
   (coque de châssis, profil de keycap, corps de switch).
2. Nettoyage et décimation : un keycap doit rester sous ~1 500 triangles, un
   switch sous ~800, le châssis sous ~40 000.
3. Export **GLB** — un fichier par géométrie, **jamais un fichier par
   couleur** : la couleur est une propriété d'instance, pas un asset.
4. Optimisation via `gltf-transform` : `dedup`, `prune`, `weld`, `simplify`,
   puis compression.

### 9.2 Décision : Meshopt plutôt que Draco

**Retenu : Meshopt** (`gltfpack` / `gltf-transform meshopt`) pour la géométrie,
**KTX2/Basis** pour les textures.

Draco compresse un peu mieux, mais son décodage est nettement plus lent et
passe par un worker WASM. Nos maillages sont petits et nombreux : le coût de
décodage domine le gain de transfert, surtout sur mobile où l'on veut la
première image le plus tôt possible. Draco reste envisageable si le châssis
s'avère beaucoup plus lourd que prévu — décision réévaluable en Phase 6.

Textures ≤ 1024², compressées en KTX2. Environnement : une petite HDRI
(≤ 512², `.hdr` compressé) suffit pour l'alu anodisé ; pas de cubemap lourde.

### 9.3 Stratégie d'instanciation — le point critique

**Règle absolue : aucune touche n'est un objet React ni un `Mesh` individuel.**

| Objet de scène                 | Type                                      | Nombre | Draw calls |
| ------------------------------ | ----------------------------------------- | -----: | ---------: |
| Châssis (coque, plaque, pieds) | `Mesh`                                    |    2–3 |        2–3 |
| Switches                       | `InstancedMesh`                           |      1 |          1 |
| Keycaps                        | `InstancedMesh` **par classe de largeur** |     ~8 |         ~8 |
| Cibles de clic invisibles      | `InstancedMesh`                           |      1 |          1 |

Total visé : **~15 draw calls** pour un clavier complet, contre ~170 avec une
approche naïve.

**Pourquoi une classe par largeur.** Un keycap 6,25u (barre d'espace) n'est pas
un keycap 1u étiré : le profil et la sculpture seraient déformés. On regroupe
donc par géométrie (1u, 1,25u, 1,5u, 1,75u, 2u, 2,25u, 2,75u, 6,25u), soit
~8 `InstancedMesh` — toujours dix fois mieux que 80 meshes. La largeur est une
propriété de la **position**, pas du keycap choisi : changer de couleur de
keycap ne fait donc jamais migrer une instance d'un mesh à l'autre.

**Couleur par instance** : `InstancedMesh.setColorAt(i, color)` +
`instanceColor.needsUpdate = true`. Peindre une touche coûte l'écriture de
trois flottants — pas un re-render.

**Matières** : au lancement, une famille de matériau par type de pièce, la
couleur variant par instance. Si le catalogue introduit plus tard des finitions
qui divergent réellement (PBT mat vs ABS brillant), deux options par ordre de
préférence : (a) un `InstancedMesh` par famille de matériau, (b) un attribut
d'instance supplémentaire injecté via `onBeforeCompile`. On ne fait ni l'un ni
l'autre tant que le catalogue ne l'exige pas.

**Matrices** : calculées une fois au chargement depuis `LayoutKey.x/y/widthU`,
`instanceMatrix.setUsage(THREE.StaticDrawUsage)`, `boundingSphere` calculée
explicitement pour que le frustum culling fonctionne.

**Frontière React / Three** : le store Zustand détient le mapping logique
`keyCode → { switchSku, keycapSku }`. Un abonnement au store pousse les
changements **impérativement** dans les attributs d'instance. Le JSX ne fait
jamais `keys.map(...)`. C'est la règle qui fait la différence entre 60 fps et
un diaporama.

### 9.4 Sélection d'une touche (raycasting)

Un `InstancedMesh` dédié de boîtes invisibles, une par position, dimensionnée
sur `widthU`/`heightU` (ici l'étirement non uniforme est sans conséquence,
l'objet ne se voit pas). Matériau `transparent, opacity: 0, depthWrite: false`.

Trois raisons plutôt que de viser directement les keycaps :

1. la cible reste identique à l'étape switches, où les keycaps sont masquées ;
2. la zone de clic est régulière et légèrement plus généreuse que la géométrie
   — décisif au doigt sur mobile (Phase 7) ;
3. un seul objet à tester au lieu de huit.

`intersection.instanceId` → tableau `instanceId → keyCode` construit au
chargement. Optimisation possible : isoler ces proxies sur un `Layer` dédié et
ne raycaster que ce layer. À valider en Phase 4 selon le comportement exact de
`Raycaster` vis-à-vis de `visible` dans la version de three installée.

### 9.5 Dégradation et repli

| Contexte                          | Comportement                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GPU correct                       | ombres douces, HDRI, `dpr` jusqu'à 2                                                                                  |
| GPU faible (détection au montage) | pas d'ombres, éclairage 3 points au lieu de l'HDRI, `dpr` plafonné à 1,25                                             |
| WebGL indisponible                | **vue de dessus 2D en SVG**, pleinement fonctionnelle : palette, peinture touche par touche, remplissage rapide, prix |

La vue 2D n'est pas un lot de consolation : c'est aussi la vue d'assistance
tactile de la Phase 7. Elle est donc développée pour de bon, pas bâclée.

**Chargement progressif** : châssis d'abord (le client voit quelque chose
immédiatement), puis switches, puis keycaps, sous `Suspense` avec un
indicateur de progression.

---

## 10. Budget de performance

| Cible                                               | Seuil                                      |
| --------------------------------------------------- | ------------------------------------------ |
| JS initial hors configurateur                       | ≤ 150 Ko gzip                              |
| LCP `/` et `/boutique` (4G, mobile milieu de gamme) | ≤ 2,0 s                                    |
| Three.js chargé ailleurs que sur `/configurateur`   | **0 octet** (`next/dynamic`, `ssr: false`) |
| Assets 3D d'une scène complète, compressés          | ≤ 3 Mo                                     |
| Première image 3D interactive (desktop / mobile)    | ≤ 2,0 s / ≤ 3,5 s                          |
| Images par seconde (desktop / mobile)               | 60 / ≥ 30                                  |
| Draw calls, scène complète                          | ≤ 30                                       |
| Triangles, scène complète                           | ≤ 400 000                                  |
| Latence peinture d'une touche → retour visuel       | ≤ 16 ms (aucune allocation dans la boucle) |
| Lighthouse Performance (marketing / configurateur)  | ≥ 90 / ≥ 75                                |

Le seuil configurateur est volontairement plus bas : une page WebGL est
pénalisée par des métriques pensées pour du document.

---

## 11. Arborescence

```
prisma/
  schema.prisma
  seed.ts                        # catalogue + layouts, dont le cas 305 €
src/
  app/
    (marketing)/page.tsx         # accueil
    boutique/page.tsx
    produit/[slug]/page.tsx
    configurateur/page.tsx       # three.js chargé ici et nulle part ailleurs
    panier/page.tsx
    commande/confirmation/page.tsx
    admin/…
    api/…                        # cf. §6.2
  components/
    ui/                          # design system
    three/                       # scène, InstancedMesh, contrôles caméra
    configurator/                # étapes, palettes, vue 2D de repli
  lib/
    pricing/                     # ✅ écrit en Phase 0
    catalog/
    cart/
    stripe/
    build/                       # schémas Zod + validation de complétude
    db.ts
  stores/
    configurator.ts              # Zustand
  content/
    fr.ts                        # tous les textes, centralisés (cf. §13)
public/
  models/                        # GLB compressés, nom versionné par hash
```

---

## 12. Sécurité et conformité

- **Prix** : recalcul serveur systématique ; aucun montant accepté du client.
- **Cookies** : panier et session admin en `httpOnly`, `secure`, `sameSite=lax`.
- **Webhook** : signature vérifiée, idempotence en base, montant revérifié.
- **Validation** : Zod à chaque frontière d'API, jamais de `as any` sur une
  entrée réseau.
- **SCA/3DS** : entièrement délégué à Stripe (§6.3).
- **Secrets** : uniquement en variables d'environnement, jamais côté client
  hors clés `NEXT_PUBLIC_*`.
- **RGPD** : données personnelles limitées à ce qu'exige une expédition ;
  bandeau cookies et pages légales en Phase 8 ; **les templates juridiques
  seront soumis à validation, aucune rédaction juridique définitive sans
  supervision.**
- **TVA** : prix affichés **TTC** (obligation B2C en France), TVA 20 %
  ventilée sur la facture. À confirmer selon le régime fiscal (§13).

---

## 13. Questions ouvertes

À trancher avant les phases indiquées. Le défaut proposé s'applique en
l'absence de réponse.

| #   | Question                                                                                                                                           | Défaut proposé                                                                           | Bloque         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| 1   | **Frais de port** : fixes, offerts au-delà d'un montant, ou par transporteur ? Absent du brief.                                                    | forfait unique France, gratuit au-dessus de 150 €                                        | Phase 3        |
| 2   | **TVA** : entreprise assujettie ? Les prix du brief (110 €, 2 €…) sont-ils TTC ?                                                                   | oui, prix TTC, TVA 20 % incluse                                                          | Phase 3        |
| 3   | **Layout de lancement** : le cas canonique implique 80 positions. On part sur un unique layout « Compact 80 », ou plusieurs formats dès le début ? | un seul layout au lancement, modèle prévu pour plusieurs                                 | Phase 1 (seed) |
| 4   | **Comptes clients** : nécessaires, ou paiement invité suffisant ?                                                                                  | paiement invité, suivi de commande par lien signé                                        | Phase 3        |
| 5   | **Prix des claviers tout faits** (§4.7) : prix catalogue propre, ou somme des pièces ?                                                             | prix catalogue propre                                                                    | Phase 2        |
| 6   | **Anglais** : prévu à court terme ? Ajouter `[locale]` après coup impose de restructurer le routage.                                               | FR uniquement, textes centralisés dans `src/content/fr.ts` pour rendre l'ajout mécanique | Phase 1        |
| 7   | **E-mails transactionnels** : fournisseur ?                                                                                                        | Resend                                                                                   | Phase 3        |
| 8   | **Marque** : nom, logo, palette.                                                                                                                   | tokens neutres en attendant, remplaçables en un fichier                                  | Phase 2        |

---

## 14. Phases et points d'arrêt

| Phase | Contenu                                     | Modèle | État                    |
| ----- | ------------------------------------------- | ------ | ----------------------- |
| 0     | Architecture + moteur de prix + test 305 €  | Opus   | ✅ terminée             |
| 1     | Scaffolding Next.js, Prisma, tokens, routes | Sonnet | ✅ terminée             |
| 2     | Design system, pages de contenu, catalogue  | Sonnet | ✅ terminée             |
| 3     | Panier serveur, Stripe, commandes, admin    | Sonnet | ✅ terminée             |
| 4     | Configurateur 3D, placement par touche      | Opus   | ✅ terminée             |
| 5     | Prix live, validation, connexion au panier  | Opus   |                         |
| 6     | Optimisation assets 3D et performance       | Sonnet | ⏸️ changement de modèle |
| 7     | QA, responsive, accessibilité, tactile      | Sonnet |                         |
| 8     | Contenu, SEO, légal, mise en production     | Sonnet |                         |
