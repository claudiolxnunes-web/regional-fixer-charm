import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

function planFromPriceId(priceId?: string): string {
  if (!priceId) return 'mensal';
  if (priceId.includes('anual')) return 'anual';
  if (priceId.includes('semestral')) return 'semestral';
  return 'mensal';
}

function monthsForOneTimePlan(plan: string): number {
  if (plan === 'anual') return 12;
  if (plan === 'semestral') return 6;
  return 1;
}

async function logEvent(eventId: string, eventType: string, teamId: string | null, payload: any) {
  await getSupabase().from('subscriptions_log').insert({
    stripe_event_id: eventId, event_type: eventType, team_id: teamId, payload,
  } as any);
}

async function ensureTeamForUser(userId: string, plan: string) {
  const supabase = getSupabase();
  // Check if user already has a team membership
  const { data: existing } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.team_id) {
    return existing.team_id as string;
  }
  // Get user info for team name
  const { data: userInfo } = await supabase.auth.admin.getUserById(userId);
  const name = (userInfo?.user?.user_metadata?.full_name as string) || userInfo?.user?.email || 'Minha Equipe';
  const { data: team, error } = await supabase
    .from('teams')
    .insert({ owner_id: userId, name: `Equipe de ${name}`, plan, subscription_status: 'pending' } as any)
    .select('id')
    .single();
  if (error || !team) throw new Error(`Failed to create team: ${error?.message}`);
  await supabase.from('team_members').insert({ team_id: team.id as string, user_id: userId, role: 'admin' } as any);
  return team.id as string;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;
  if (!userId) return;
  const plan = planFromPriceId(priceId);
  const teamId = await ensureTeamForUser(userId, plan);

  const update: any = {
    stripe_customer_id: session.customer,
    plan,
    subscription_status: 'active',
    updated_at: new Date().toISOString(),
  };

  // For one-time payment (semestral), set period end manually = +6 months
  if (session.mode === 'payment') {
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    update.current_period_end = end.toISOString();
  } else if (session.subscription) {
    update.stripe_subscription_id = session.subscription;
    // Fetch sub for period end
    try {
      const stripe = createStripeClient(env);
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      const item = sub.items?.data?.[0] as any;
      const periodEnd = item?.current_period_end ?? (sub as any).current_period_end;
      if (periodEnd) update.current_period_end = new Date(periodEnd * 1000).toISOString();
    } catch (e) { console.error('sub fetch failed', e); }
  }

  await getSupabase().from('teams').update(update).eq('id', teamId);
}

async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.userId;
  const priceId = subscription.metadata?.priceId
    || subscription.items?.data?.[0]?.price?.lookup_key
    || subscription.items?.data?.[0]?.price?.metadata?.lovable_external_id;
  if (!userId) return;

  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const update: any = {
    subscription_status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status,
    plan: planFromPriceId(priceId),
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  // Find team by user
  const { data: tm } = await getSupabase().from('team_members').select('team_id').eq('user_id', userId).maybeSingle();
  if (tm?.team_id) {
    await getSupabase().from('teams').update(update).eq('id', tm.team_id as string);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  await getSupabase()
    .from('teams')
    .update({ subscription_status: 'canceled', updated_at: new Date().toISOString() } as any)
    .eq('stripe_subscription_id', subscription.id);
}

async function handle(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      console.log('Unhandled event:', event.type);
  }
  await logEvent(event.id, event.type, null, event.data.object).catch(() => {});
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        try {
          await handle(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
