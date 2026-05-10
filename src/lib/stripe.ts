import { loadStripe, Stripe } from "@stripe/stripe-js";

type StripeEnv = 'sandbox' | 'live';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
const environment: StripeEnv = clientToken?.startsWith('pk_test_') ? 'sandbox' : 'live';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}

export const PLANS = [
  {
    id: 'plano_mensal_brl',
    name: 'Mensal',
    price: 'R$ 297,00',
    period: '/mês',
    description: 'Cobrança mensal recorrente. Cancele quando quiser.',
    features: ['Até 20 representantes', 'Todos os módulos', 'Suporte padrão'],
    badge: null as string | null,
  },
  {
    id: 'plano_semestral_brl',
    name: 'Semestral',
    price: 'R$ 1.514,70',
    period: 'à vista / 6 meses',
    description: 'Pagamento único com 15% de desconto. Renovação manual.',
    features: ['Até 20 representantes', 'Todos os módulos', '15% de desconto', 'Suporte prioritário'],
    badge: '15% OFF',
  },
  {
    id: 'plano_anual_brl',
    name: 'Anual',
    price: 'R$ 2.673,00',
    period: '/ano',
    description: 'Renovação anual automática com 25% de desconto.',
    features: ['Até 20 representantes', 'Todos os módulos', '25% de desconto', 'Suporte VIP'],
    badge: 'MAIS ECONÔMICO',
  },
] as const;
