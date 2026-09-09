/**
 * Textes du site, centralisés ici plutôt qu'éparpillés dans les composants.
 * Le site est FR uniquement au lancement (ARCHITECTURE.md §13 Q6) ; cette
 * centralisation rend l'ajout d'une locale ultérieure mécanique plutôt que
 * de nécessiter un refactor.
 */
export const fr = {
  site: {
    name: 'Claviers Custom',
    tagline: 'Claviers mécaniques sur mesure, assemblés à la demande.',
  },
  nav: {
    home: 'Accueil',
    shop: 'Boutique',
    configurator: 'Configurateur',
    cart: 'Panier',
  },
  pages: {
    home: {
      title: 'Construisez le clavier qui vous ressemble',
      subtitle:
        'Un catalogue de claviers mécaniques prêts à l’emploi, et un configurateur 3D pour choisir chaque switch et chaque keycap, touche par touche.',
      ctaShop: 'Voir le catalogue',
      ctaConfigurator: 'Ouvrir le configurateur',
    },
    shop: {
      title: 'Boutique',
      empty: 'Le catalogue sera mis en ligne à la Phase 2.',
    },
    product: {
      backToShop: 'Retour à la boutique',
    },
    configurator: {
      title: 'Configurateur 3D',
      comingSoon: 'Le configurateur sera développé en Phase 4.',
    },
    cart: {
      title: 'Panier',
      empty: 'Votre panier est vide.',
    },
    orderConfirmation: {
      title: 'Merci pour votre commande',
      pending: 'Confirmation du paiement en cours…',
    },
    admin: {
      title: 'Back-office',
      comingSoon: 'L’espace admin sera développé en Phase 3.',
    },
  },
} as const;
