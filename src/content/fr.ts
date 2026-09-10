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
  cookies: {
    bannerLabel: 'Gestion des cookies',
    message: 'Cookies essentiels (panier, session) et, avec votre accord, cookies de mesure d’audience.',
    learnMore: 'En savoir plus',
    accept: 'Accepter',
    decline: 'Refuser',
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
      metaDescription: 'Claviers mécaniques assemblés et réglés, prêts à commander.',
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
      fillEmpty: (name: string) => `Remplir le reste avec ${name}`,
      clearHint: 'Recliquez une pièce déjà posée pour la retirer (ou Maj + clic).',
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
        '2d': '2D',
      },
      history: {
        label: 'Historique',
        undo: 'Annuler',
        redo: 'Rétablir',
      },
      a11y: {
        sceneHidden:
          'Représentation 3D du clavier, non pilotable au clavier. Utilisez le bouton « 2D » ci-dessus pour configurer le clavier sans souris.',
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
      customBuildConsent:
        'Je comprends que les claviers configurés sur mesure sont fabriqués selon mes choix et ne bénéficient pas du droit de rétractation de 14 jours (article L.221-28 du Code de la consommation — voir les CGV).',
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
    errors: {
      generic: {
        title: 'Une erreur est survenue',
        description: 'Quelque chose s’est mal passé de notre côté. Vous pouvez réessayer.',
        retry: 'Réessayer',
        backHome: 'Retour à l’accueil',
      },
      global: {
        title: 'Le site a rencontré un problème',
        description: 'Veuillez recharger la page. Si le problème persiste, revenez plus tard.',
        retry: 'Recharger',
      },
      configurator: {
        title: 'Le configurateur a rencontré un problème',
        description:
          'L’affichage 3D a échoué. Votre configuration n’est pas perdue — vous pouvez réessayer ou basculer sur la vue de dessus.',
        retry: 'Réessayer',
      },
      notFound: {
        title: 'Page introuvable',
        description: 'Cette page n’existe pas ou plus.',
        backHome: 'Retour à l’accueil',
      },
    },
    legal: {
      disclaimer:
        'Modèle de page juridique fourni à titre indicatif — à faire relire et valider par un professionnel du droit avant toute mise en ligne. Les mentions entre crochets sont à compléter.',
      nav: {
        mentionsLegales: 'Mentions légales',
        cgv: 'CGV',
        confidentialite: 'Confidentialité',
      },
      mentionsLegales: {
        title: 'Mentions légales',
        sections: [
          {
            heading: 'Éditeur du site',
            paragraphs: [
              '[Raison sociale à compléter], [forme juridique à compléter, ex. SASU] au capital de [montant] €, immatriculée au Registre du commerce et des sociétés de [ville] sous le numéro [SIREN/SIRET à compléter], dont le siège social est situé [adresse à compléter].',
              'Numéro de TVA intracommunautaire : [FR00 000000000 à compléter].',
              'Directeur de la publication : [nom à compléter].',
              'Contact : [adresse e-mail à compléter].',
            ],
          },
          {
            heading: 'Hébergement',
            paragraphs: [
              'Le site est hébergé par [hébergeur à compléter], [adresse de l’hébergeur à compléter].',
            ],
          },
          {
            heading: 'Propriété intellectuelle',
            paragraphs: [
              'L’ensemble des contenus présents sur ce site (textes, images, logos, structure du configurateur 3D) est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle, est soumise à autorisation préalable.',
            ],
          },
          {
            heading: 'Médiation de la consommation',
            paragraphs: [
              'Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, [Raison sociale] propose un dispositif de médiation de la consommation. Le médiateur retenu est [nom du médiateur à compléter]. En cas de litige non résolu directement avec le service client, le consommateur peut déposer sa réclamation sur le site du médiateur : [adresse à compléter].',
            ],
          },
        ],
      },
      cgv: {
        title: 'Conditions générales de vente',
        sections: [
          {
            heading: 'Champ d’application',
            paragraphs: [
              'Les présentes conditions générales de vente régissent les ventes de claviers mécaniques réalisées sur ce site, qu’il s’agisse d’un clavier du catalogue (configuration fixe) ou d’un clavier composé via le configurateur 3D (choix du châssis puis des switches et keycaps, position par position). Toute commande implique l’acceptation sans réserve des présentes conditions.',
            ],
          },
          {
            heading: 'Prix',
            paragraphs: [
              'Les prix sont indiqués en euros, toutes taxes comprises (TVA française au taux en vigueur, actuellement 20 %). Pour un clavier configuré sur mesure, le prix affiché pendant la configuration est indicatif : le montant définitif est recalculé au moment du paiement à partir des tarifs alors en vigueur, et c’est ce montant recalculé qui est facturé.',
            ],
          },
          {
            heading: 'Commande',
            paragraphs: [
              'La commande est validée après confirmation du panier et paiement intégral. Un e-mail de confirmation est envoyé à l’adresse renseignée. Aucune création de compte n’est nécessaire ; le suivi de commande se fait par lien direct transmis par e-mail.',
            ],
          },
          {
            heading: 'Paiement',
            paragraphs: [
              'Le paiement est traité par Stripe, prestataire de paiement tiers, par carte bancaire. Le site ne stocke aucune donnée de carte bancaire. Le paiement peut être soumis à une authentification forte du porteur (3D Secure) conformément à la réglementation européenne sur les services de paiement.',
            ],
          },
          {
            heading: 'Livraison',
            paragraphs: [
              'Les délais de livraison sont indicatifs : [délai à compléter]. La livraison est assurée par [transporteur à compléter] vers [zones desservies à compléter].',
            ],
          },
          {
            heading: 'Droit de rétractation',
            paragraphs: [
              'Conformément à l’article L.221-18 du Code de la consommation, le client dispose d’un délai de 14 jours à compter de la réception pour exercer son droit de rétractation sur un clavier du catalogue non personnalisé.',
              'Ce droit ne s’applique pas aux claviers composés via le configurateur : en vertu de l’article L.221-28 3° du Code de la consommation, les biens confectionnés selon les spécifications du consommateur ou nettement personnalisés sont exclus du droit de rétractation. Cette information est rappelée au client avant le paiement de toute commande contenant un clavier configuré.',
            ],
          },
          {
            heading: 'Garanties légales',
            paragraphs: [
              'Tout produit vendu bénéficie de la garantie légale de conformité (articles L.217-3 et suivants du Code de la consommation) et de la garantie légale des vices cachés (articles 1641 et suivants du Code civil), sans supplément de prix.',
            ],
          },
          {
            heading: 'Droit applicable et litiges',
            paragraphs: [
              'Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire (voir Mentions légales — médiation de la consommation).',
            ],
          },
        ],
      },
      confidentialite: {
        title: 'Politique de confidentialité',
        sections: [
          {
            heading: 'Responsable du traitement',
            paragraphs: [
              '[Raison sociale à compléter], éditeur du site, est responsable du traitement des données personnelles décrit ci-dessous. Contact : [adresse e-mail à compléter].',
            ],
          },
          {
            heading: 'Données collectées',
            list: [
              'identité (nom, prénom)',
              'adresse de livraison et, si différente, de facturation',
              'adresse e-mail et numéro de téléphone',
              'détail de la configuration du clavier commandé (châssis, switches, keycaps choisis)',
            ],
            paragraphs: [
              'Aucun compte client n’est créé : ces données sont associées à la commande, pas à un profil permanent.',
            ],
          },
          {
            heading: 'Finalités et base légale',
            paragraphs: [
              'Ces données sont utilisées pour traiter la commande, assurer la livraison et le service après-vente. Le traitement repose sur l’exécution du contrat de vente.',
            ],
          },
          {
            heading: 'Destinataires des données',
            list: [
              'Stripe, pour le traitement du paiement',
              '[transporteur à compléter], pour la livraison',
              'Resend, pour l’envoi de l’e-mail de confirmation de commande',
            ],
            paragraphs: [
              'Ces prestataires n’accèdent qu’aux données strictement nécessaires à leur mission et ne sont pas autorisés à les réutiliser à d’autres fins.',
            ],
          },
          {
            heading: 'Durée de conservation',
            paragraphs: [
              'Les données de commande sont conservées [durée à compléter, ex. 5 ans — durée légale de conservation des pièces comptables et commerciales]. Les données d’un panier abandonné avant paiement sont supprimées automatiquement.',
            ],
          },
          {
            heading: 'Cookies',
            paragraphs: [
              'Ce site utilise des cookies strictement nécessaires (panier, session d’administration), déposés sans consentement préalable car indispensables au fonctionnement du site, ainsi que, avec le consentement du visiteur, des cookies de mesure d’audience. Voir le bandeau de gestion des cookies pour configurer vos préférences à tout moment.',
            ],
          },
          {
            heading: 'Vos droits',
            list: [
              'droit d’accès',
              'droit de rectification',
              'droit d’effacement',
              'droit d’opposition',
              'droit à la portabilité',
            ],
            paragraphs: [
              'Pour exercer ces droits, contactez [adresse e-mail à compléter]. Vous disposez également du droit d’introduire une réclamation auprès de la CNIL (cnil.fr).',
            ],
          },
          {
            heading: 'Sécurité',
            paragraphs: [
              'Les mots de passe d’administration sont hachés et jamais stockés en clair. Les échanges avec le site sont chiffrés (HTTPS). Aucune donnée de carte bancaire ne transite par nos serveurs : le paiement est entièrement géré par Stripe.',
            ],
          },
        ],
      },
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
