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
      adding: 'Ajout…',
      addedToCart: 'Ajouté au panier.',
      addError: 'Une erreur est survenue, réessayez.',
      viewCart: 'Voir le panier',
    },
    configurator: {
      title: 'Configurateur 3D',
      intro: 'Choisissez un châssis, puis posez switches et keycaps touche par touche.',
      steps: {
        chassis: 'Châssis',
        switches: 'Switches',
        keycaps: 'Keycaps',
        summary: 'Récapitulatif',
      },
      stepHelp: {
        chassis: 'Le châssis est unique pour tout le clavier.',
        switches: 'Sélectionnez un type, puis cliquez les touches à équiper.',
        keycaps: 'Sélectionnez une couleur, puis cliquez les touches à habiller.',
        summary: 'Vérifiez votre configuration avant de l’ajouter au panier.',
      },
      previous: 'Précédent',
      next: 'Suivant',
      fillAll: (name: string) => `Tout mettre en ${name}`,
      clearHint: 'Maj + clic pour retirer une pièce.',
      progress: (done: number, total: number) =>
        `${done} / ${total} touches assignées (switch + keycap)`,
      switchProgress: (done: number, total: number) => `${done} / ${total} switches posés`,
      keycapProgress: (done: number, total: number) => `${done} / ${total} keycaps posées`,
      perUnit: '/u',
      views: {
        label: 'Vue',
        trois_quarts: '3/4',
        dessus: 'Dessus',
        face: 'Face',
        gauche: 'Gauche',
      },
      reset: 'Tout réinitialiser',
      summary: {
        chassis: 'Châssis',
        switches: 'Switches',
        keycaps: 'Keycaps',
        empty: 'Rien de posé pour l’instant.',
        incomplete: (missing: number) =>
          `${missing} position${missing > 1 ? 's' : ''} encore incomplète${missing > 1 ? 's' : ''}.`,
        complete: 'Configuration complète.',
        detail: 'Détail du prix',
      },
      total: 'Total',
      liveNotice: 'Prix indicatif — le montant facturé est recalculé au paiement.',
      addToCart: 'Ajouter au panier',
      adding: 'Ajout…',
      added: 'Clavier ajouté au panier.',
      viewCart: 'Voir le panier',
      blockedIncomplete: 'Complétez toutes les positions pour ajouter au panier.',
      webglUnavailableNotice: '3D non disponible sur ce navigateur — vue de dessus activée.',
      renderMode: {
        label: 'Affichage',
        '3d': '3D',
        '2d': 'Vue de dessus',
      },
    },
    cart: {
      title: 'Panier',
      empty: 'Votre panier est vide.',
      browseShop: 'Voir le catalogue',
      quantity: 'Quantité',
      remove: 'Retirer',
      total: 'Total',
      checkout: 'Passer au paiement',
      checkoutError: 'Le paiement est momentanément indisponible, réessayez dans un instant.',
    },
    orderConfirmation: {
      title: 'Merci pour votre commande',
      pending: 'Confirmation du paiement en cours…',
      delayed:
        'Cela prend plus de temps que prévu. Vous recevrez un e-mail dès que le paiement sera confirmé.',
      noSession: 'Aucune commande à afficher.',
      orderNumber: 'Commande',
      emailNotice: (email: string) => `Un e-mail de confirmation a été envoyé à ${email}.`,
    },
    admin: {
      title: 'Back-office',
      login: {
        title: 'Connexion',
        email: 'E-mail',
        password: 'Mot de passe',
        submit: 'Se connecter',
        error: 'Identifiants incorrects.',
      },
      logout: 'Se déconnecter',
      orders: {
        title: 'Commandes',
        empty: 'Aucune commande pour le moment.',
        columns: { number: 'N°', date: 'Date', email: 'Client', status: 'Statut', total: 'Total' },
        backToList: 'Retour aux commandes',
        detailTitle: 'Détail de la commande',
        shippingAddress: 'Adresse de livraison',
        billOfMaterials: 'Nomenclature de fabrication',
        assemblyPlan: 'Plan de montage',
        assemblyColumns: { position: 'Position', switch: 'Switch', keycap: 'Keycap' },
        assemblyCount: (n: number) => `${n} positions`,
        notFound: 'Commande introuvable.',
      },
    },
  },
} as const;
