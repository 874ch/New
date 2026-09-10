import { formatPriceCents } from '@/lib/pricing';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface OrderConfirmationEmailInput {
  email: string;
  number: string;
  totalCents: number;
}

function renderOrderConfirmationHtml({ number, totalCents }: OrderConfirmationEmailInput): string {
  return `
    <p>Merci pour votre commande !</p>
    <p>Numéro de commande : <strong>${number}</strong></p>
    <p>Montant réglé : <strong>${formatPriceCents(totalCents)}</strong></p>
    <p>Nous préparons votre clavier et vous tiendrons informé de l'expédition.</p>
  `.trim();
}

/**
 * Best-effort : la commande est déjà enregistrée en base quand cette
 * fonction est appelée, donc un échec d'envoi ne doit jamais remonter
 * (le webhook Stripe ne doit pas rejouer un événement déjà traité juste
 * parce que l'e-mail a échoué).
 */
export async function sendOrderConfirmationEmail(
  input: OrderConfirmationEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `RESEND_API_KEY absente — e-mail de confirmation non envoyé pour ${input.number}.`,
    );
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Expéditeur de test Resend par défaut, valable sans domaine vérifié.
        // À remplacer par une adresse sur le domaine de la marque en prod.
        from: process.env.ORDER_EMAIL_FROM ?? 'onboarding@resend.dev',
        to: input.email,
        subject: `Confirmation de commande ${input.number}`,
        html: renderOrderConfirmationHtml(input),
      }),
    });

    if (!response.ok) {
      console.error(
        `Échec de l'envoi Resend (${response.status}) pour ${input.number} :`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error(`Erreur réseau lors de l'envoi de l'e-mail pour ${input.number} :`, error);
  }
}
