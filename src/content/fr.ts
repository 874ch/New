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
      featured: 'En vedette',
      featureShop: {
        title: 'Catalogue',
        description: 'Des claviers déjà assemblés, prêts à commander.',
        cta: 'Voir la boutique',
      },
      featureConfigurator: {
        title: 'Configurateur 3D',
        description: 'Choisissez chaque switch et chaque keycap, touche par touche.',
        cta: 'Ouvrir le configurateur',
      },
    },
    shop: {
      title: 'Boutique',
      empty: 'Aucun clavier disponible pour le moment.',
      fromPrice: 'À partir de',
      limitedStock: 'Stock limité',
      variantsCount: (n: number) => `${n} variantes`,
    },
    product: {
      backToShop: 'Retour à la boutique',
      unavailable: 'Actuellement indisponible.',
      variantLabel: 'Variante',
      addToCart: 'Ajouter au panier',
      cartComingSoon: 'Le panier sera activé en Phase 3.',
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
