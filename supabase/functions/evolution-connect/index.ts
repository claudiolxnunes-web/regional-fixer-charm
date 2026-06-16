import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type ConnectPayload = {
  team_id?: string;
  instance_name?: string;
  phone_number?: string;
  to_number?: string;
  message?: string;
  action?: 'connect' | 'create' | 'status' | 'send';
};

type EvolutionConfig = {
  api_url: string;
  api_key: string;
  instance_name: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function ensureTeamAccess(admin: ReturnType<typeof createClient>, teamId: string, userId: string) {
  const { data } = await admin
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

async function loadConfig(admin: ReturnType<typeof createClient>, teamId: string): Promise<EvolutionConfig | null> {
  const { data, error } = await admin
    .from('whatsapp_config')
    .select('api_url, api_key, instance_name')
    .eq('team_id', teamId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar configuração WhatsApp: ${error.message}`);
  if (!data?.api_url || !data?.api_key || !data?.instance_name) return null;
  return data as EvolutionConfig;
}

async function callEvolutionRaw(url: string, apiKey: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = await readJson(response);
  return { ok: response.ok, status: response.status, data };
}

async function callEvolution(url: string, apiKey: string, init?: RequestInit) {
  const result = await callEvolutionRaw(url, apiKey, init);
  if (!result.ok && (result.status === 401 || result.status === 403)) {
    const fallbackKey = Deno.env.get('EVOLUTION_API_KEY');
    if (fallbackKey && fallbackKey !== apiKey) {
      console.warn('Evolution rejeitou api_key do banco; tentando EVOLUTION_API_KEY.');
      const retry = await callEvolutionRaw(url, fallbackKey, init);
      if (retry.ok) return retry;
      if (retry.status !== 401 && retry.status !== 403) return retry;
    }
  }
  return result;
}

function hasQrPayload(data: any) {
  const values = [data?.base64, data?.qrcode?.base64, data?.qrcode?.code, data?.qrcode?.pairingCode, data?.code, data?.pairingCode, data?.data?.base64, data?.data?.qrcode];
  return values.some((value) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    const n = value.toLowerCase().trim();
    return !n.includes('scan qr code') && !n.includes('whatsapp web') && !n.includes('escaneie') && !n.includes('leia o qr');
  });
}

function collectStates(data: any, acc: string[] = []): string[] {
  if (!data || typeof data !== 'object') return acc;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && ['state', 'status', 'connectionstatus', 'instancestatus'].includes(key.toLowerCase())) {
      acc.push(value.toLowerCase().trim());
    } else if (value && typeof value === 'object') {
      collectStates(value, acc);
    }
  }
  return acc;
}

function isAlreadyConnected(data: any) {
  return collectStates(data).some((s) => ['open', 'connected', 'conectado'].includes(s));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'Sessão inválida' }, 401);

    const body = (await req.json().catch(() => ({}))) as ConnectPayload;
    const teamId = body.team_id;
    if (!teamId) return json({ error: 'team_id obrigatório' }, 400);

    const hasAccess = await ensureTeamAccess(admin, teamId, userData.user.id);
    if (!hasAccess) return json({ error: 'Sem acesso a esta equipe' }, 403);

    const config = await loadConfig(admin, teamId);
    if (!config) return json({ error: 'Configuração Evolution incompleta para esta equipe' }, 400);

    const instanceName = (body.instance_name || config.instance_name).trim();
    if (!instanceName) return json({ error: 'Nome da instância obrigatório' }, 400);

    const baseUrl = config.api_url.replace(/\/+$/, '');

    if (body.action === 'status') {
      const list = await callEvolution(`${baseUrl}/instance/fetchInstances`, config.api_key);
      if (!list.ok) return json({ error: 'Falha ao consultar Evolution', details: list.data }, list.status);
      return json({ success: true, instances: list.data });
    }

    if (body.action === 'send') {
      const toNumber = body.to_number?.replace(/\D/g, '');
      const message = body.message?.trim();
      if (!toNumber) return json({ error: 'Número de destino obrigatório' }, 400);
      if (!message) return json({ error: 'Mensagem obrigatória' }, 400);

      const sent = await callEvolution(`${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`, config.api_key, {
        method: 'POST',
        body: JSON.stringify({
          number: toNumber,
          options: { delay: 1200, presence: 'composing', linkPreview: false },
          textMessage: { text: message },
        }),
      });
      if (!sent.ok) return json({ error: 'Falha ao enviar mensagem pela Evolution', details: sent.data }, sent.status);
      return json({ success: true, response: sent.data });
    }

    const encodedInstance = encodeURIComponent(instanceName);
    const number = body.phone_number?.replace(/\D/g, '');

    const stateCheck = await callEvolution(`${baseUrl}/instance/connectionState/${encodedInstance}`, config.api_key);
    if (stateCheck.ok && isAlreadyConnected(stateCheck.data)) {
      return json({ success: true, alreadyConnected: true, state: 'open', qrcode: stateCheck.data, message: 'Instância já está conectada ao WhatsApp.' });
    }

    let createData: unknown = null;
    if (body.action === 'create') {
      const created = await callEvolution(`${baseUrl}/instance/create`, config.api_key, {
        method: 'POST',
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      });
      createData = created.data;
      if (!created.ok && created.status !== 403 && created.status !== 409) {
        return json({ error: 'Falha ao criar instância na Evolution', details: created.data }, created.status);
      }
      if (hasQrPayload(created.data)) return json({ success: true, qrcode: created.data, created: true });
      if (isAlreadyConnected(created.data)) {
        return json({ success: true, alreadyConnected: true, state: 'open', qrcode: created.data });
      }
    }

    const query = number ? `?number=${encodeURIComponent(number)}` : '';
    const attempts = [
      () => callEvolution(`${baseUrl}/instance/connect/${encodedInstance}${query}`, config.api_key),
      () => callEvolution(`${baseUrl}/instance/connect/${encodedInstance}`, config.api_key, {
        method: 'POST',
        body: JSON.stringify(number ? { number } : {}),
      }),
      () => callEvolution(`${baseUrl}/instance/connect`, config.api_key, {
        method: 'POST',
        body: JSON.stringify(number ? { instanceName, number } : { instanceName }),
      }),
    ];

    const results = [];
    for (const attempt of attempts) {
      const result = await attempt();
      results.push({ status: result.status, data: result.data });
      if (result.ok && hasQrPayload(result.data)) {
        return json({ success: true, qrcode: result.data, create: createData });
      }
      if (result.ok && isAlreadyConnected(result.data)) {
        return json({ success: true, alreadyConnected: true, state: 'open', qrcode: result.data });
      }
    }

    return json({
      error: number
        ? 'A Evolution respondeu sem QR Code/código de pareamento. Confira se o número está correto e tente novamente.'
        : 'A Evolution respondeu sem QR Code. Se o celular já está pareado, desconecte em Aparelhos Conectados ou recrie a instância.',
      details: results,
    });
  } catch (error) {
    console.error('evolution-connect error', error);
    return json({ error: (error as Error).message }, 500);
  }
});
