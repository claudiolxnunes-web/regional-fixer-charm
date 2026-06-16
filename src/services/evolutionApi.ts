/**
 * Service to interact with Evolution API via the `evolution-connect` edge function.
 * All calls are proxied through the backend so the API key is never exposed.
 */
import { supabase } from "@/integrations/supabase/client";

export interface EvolutionInstance {
  instanceName: string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
  status: 'open' | 'connecting' | 'disconnecting' | 'close';
  serverUrl?: string;
  apikey?: string;
}

export interface EvolutionQrCode {
  base64?: string;
  code?: string;
  pairingCode?: string;
  count?: number;
  state?: string;
  raw?: unknown;
}

export interface EvolutionConnectParams {
  teamId: string;
  instanceName: string;
  phoneNumber?: string;
  action?: "connect" | "create";
}

export interface EvolutionSendParams {
  teamId: string;
  instanceName: string;
  number: string;
  text: string;
}

export class EvolutionApiError extends Error {
  details?: unknown;
  status?: number;
  constructor(message: string, details?: unknown, status?: number) {
    super(message);
    this.name = "EvolutionApiError";
    this.details = details;
    this.status = status;
  }
}

const normalizeConnectionStatus = (value?: string): EvolutionInstance["status"] => {
  const s = value?.toLowerCase().trim();
  if (["open", "connected", "conectado"].includes(s || "")) return "open";
  if (["connecting", "qrcode", "qr", "pairing", "loading", "conectando"].includes(s || "")) return "connecting";
  if (["disconnecting", "desconectando"].includes(s || "")) return "disconnecting";
  return "close";
};

const normalizeInstance = (item: any): EvolutionInstance => {
  const source = item?.instance ?? item;
  const rawStatus = source?.status ?? source?.connectionStatus ?? source?.state ?? item?.status ?? item?.connectionStatus ?? item?.state;
  return {
    instanceName: source?.instanceName ?? source?.name ?? item?.instanceName ?? "Instância sem nome",
    owner: source?.owner ?? item?.owner,
    profileName: source?.profileName ?? item?.profileName,
    profilePictureUrl: source?.profilePictureUrl ?? item?.profilePictureUrl,
    status: normalizeConnectionStatus(rawStatus),
    serverUrl: source?.serverUrl ?? item?.serverUrl,
    apikey: source?.apikey ?? item?.apikey,
  };
};

const normalizeBase64Image = (value?: string) => {
  if (!value) return undefined;
  if (value.startsWith("data:image") || value.startsWith("http")) return value;
  return `data:image/png;base64,${value}`;
};

const collectObjects = (value: any): any[] => {
  if (!value || typeof value !== "object") return [];
  const nested = Object.values(value).flatMap((item) => collectObjects(item));
  return [value, ...nested];
};

const firstString = (objects: any[], keys: string[]) => {
  for (const o of objects) for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
};

const firstNumber = (objects: any[], keys: string[]) => {
  for (const o of objects) for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
};

const looksLikeImage = (value: string) => (
  value.startsWith("data:image") || value.startsWith("http") ||
  value.startsWith("iVBOR") || value.startsWith("/9j/") ||
  (value.length > 500 && /^[A-Za-z0-9+/=\r\n]+$/.test(value))
);

const isInstructionalQrMessage = (value?: string) => {
  const n = value?.toLowerCase().trim() ?? "";
  return Boolean(n) && (n.includes("scan qr code") || n.includes("whatsapp web") || n.includes("escaneie") || n.includes("leia o qr"));
};

const isUsableQrString = (value?: string) => Boolean(value?.trim()) && !isInstructionalQrMessage(value);

const normalizeQrCode = (data: any): EvolutionQrCode => {
  if (typeof data === "string") {
    const v = data.trim();
    if (looksLikeImage(v)) return { base64: normalizeBase64Image(v) };
    return isUsableQrString(v) ? { code: v } : { raw: data };
  }
  const direct = [
    data?.base64, data?.base64Image, data?.qrCodeBase64,
    data?.qrcode, data?.qrCode, data?.qr, data?.code,
    data?.data?.base64, data?.data?.qrcode, data?.data?.qrCode,
    data?.instance?.qrcode,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  for (const candidate of direct) {
    const v = candidate.trim();
    if (looksLikeImage(v)) return { base64: normalizeBase64Image(v), raw: data };
  }

  const objects = collectObjects(data);
  const base64 = firstString(objects, ["base64", "base64Image", "qrCodeBase64", "qrBase64", "qrcodeBase64", "base64Qr", "base64QRCode", "qrCodeImage", "qrcodeImage", "image", "src"]);
  const code = direct.find((v) => !looksLikeImage(v) && isUsableQrString(v))
    ?? firstString(objects, ["code", "qrCode", "qrcode", "qr", "qrCodeString", "qr_code"]);
  const pairingCode = firstString(objects, ["pairingCode", "pairing_code"]);
  return {
    base64: normalizeBase64Image(base64),
    code: isUsableQrString(code) ? code : undefined,
    pairingCode: isUsableQrString(pairingCode) ? pairingCode : undefined,
    count: typeof data?.count === "number" ? data.count : firstNumber(objects, ["count"]),
    state: firstString(objects, ["state", "status", "connectionStatus"]),
    raw: data,
  };
};

export const evolutionService = {
  async fetchInstances(teamId: string, instanceName: string): Promise<EvolutionInstance[]> {
    const { data, error } = await supabase.functions.invoke("evolution-connect", {
      body: { team_id: teamId, instance_name: instanceName, action: "status" },
    });
    if (error) throw error;
    if (data?.error) throw new EvolutionApiError(data.error, data.details ?? data);
    const list = data?.instances;
    return Array.isArray(list) ? list.map(normalizeInstance) : [];
  },

  async connect({ teamId, instanceName, phoneNumber, action = "connect" }: EvolutionConnectParams) {
    const { data, error } = await supabase.functions.invoke("evolution-connect", {
      body: { team_id: teamId, instance_name: instanceName, phone_number: phoneNumber, action },
    });
    if (error) throw error;
    if (data?.error) throw new EvolutionApiError(data.error, data.details ?? data, data.status);
    const normalized = normalizeQrCode(data?.qrcode ?? data);
    return { ...normalized, alreadyConnected: Boolean(data?.alreadyConnected), raw: data };
  },

  async sendMessage({ teamId, instanceName, number, text }: EvolutionSendParams) {
    const { data, error } = await supabase.functions.invoke("evolution-connect", {
      body: { team_id: teamId, instance_name: instanceName, action: "send", to_number: number, message: text },
    });
    if (error) throw error;
    if (data?.error) throw new EvolutionApiError(data.error, data.details ?? data, data.status);
    return data?.response ?? data;
  },
};
