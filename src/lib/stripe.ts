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

export type BillingOption = {
  id: string;
  label: string;
  price: string;
  period: string;
  note?: string;
  badge?: string;
};

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: readonly string[];
  badge: string | null;
  billing: readonly BillingOption[];
};

export const PLANS: readonly Plan[] = [
  {
    id: 'empresa',
    name: 'Empresa',
    tagline: '1 licença',
    description: 'Ideal para profissionais autônomos e pequenos negócios.',
    features: ['1 licença de usuário', 'Todos os módulos', 'Suporte padrão'],
    badge: null,
    billing: [
      { id: 'empresa_mensal', label: 'Mensal', price: 'R$ 97,00', period: '/mês', note: 'Cobrança mensal recorrente' },
      { id: 'empresa_semestral', label: 'Semestral', price: 'R$ 494,70', period: '6 meses à vista', note: '15% de desconto', badge: '15% OFF' },
      { id: 'empresa_anual', label: 'Anual', price: 'R$ 873,00', period: '12 meses à vista', note: '25% de desconto', badge: '25% OFF' },
    ],
  },
  {
    id: 'gestor',
    name: 'Gestor Comercial',
    tagline: 'Até 10 representantes',
    description: 'Para equipes comerciais em crescimento.',
    features: ['Até 10 representantes', 'Todos os módulos', 'Suporte prioritário'],
    badge: 'MAIS POPULAR',
    billing: [
      { id: 'gestor_mensal', label: 'Mensal', price: 'R$ 297,00', period: '/mês', note: 'Cobrança mensal recorrente' },
      { id: 'gestor_semestral', label: 'Semestral', price: 'R$ 1.514,70', period: '6 meses à vista', note: '15% de desconto', badge: '15% OFF' },
      { id: 'gestor_anual', label: 'Anual', price: 'R$ 2.673,00', period: '12 meses à vista', note: '25% de desconto', badge: '25% OFF' },
    ],
  },
  {
    id: 'consultor',
    name: 'Consultor Comercial',
    tagline: 'Até 20 representantes',
    description: 'Para consultorias e operações comerciais robustas.',
    features: ['Até 20 representantes', 'Todos os módulos', 'Suporte VIP'],
    badge: null,
    billing: [
      { id: 'consultor_mensal', label: 'Mensal', price: 'R$ 497,00', period: '/mês', note: 'Cobrança mensal recorrente' },
      { id: 'consultor_semestral', label: 'Semestral', price: 'R$ 2.534,70', period: '6 meses à vista', note: '15% de desconto', badge: '15% OFF' },
      { id: 'consultor_anual', label: 'Anual', price: 'R$ 4.473,00', period: '12 meses à vista', note: '25% de desconto', badge: '25% OFF' },
    ],
  },
] as const;
