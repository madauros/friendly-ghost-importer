import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type SpaceKey = "talameed" | "taleem" | "admin";

export interface SpaceConfig {
  key: SpaceKey;
  host: string;
  title: string;
  subtitle: string;
  accent: string;
  path: "/talameed" | "/taleem" | "/admin";
}

export const SPACES: Record<SpaceKey, SpaceConfig> = {
  talameed: {
    key: "talameed",
    host: "talameed.madauros",
    title: "فضاء التلاميذ",
    subtitle: "سجّل الدخول للوصول إلى دروسك وواجباتك",
    accent: "brand-blue",
    path: "/talameed",
  },
  taleem: {
    key: "taleem",
    host: "taleem.madauros",
    title: "فضاء التعليم",
    subtitle: "سجّل الدخول لإدارة أقسامك ودروسك",
    accent: "brand-green",
    path: "/taleem",
  },
  admin: {
    key: "admin",
    host: "admin.madauros",
    title: "فضاء الإدارة",
    subtitle: "المشرف العام يصادق على الحسابات الجديدة",
    accent: "brand-red",
    path: "/admin",
  },
};

const clients: Partial<Record<SpaceKey, SupabaseClient<Database>>> = {};

/**
 * One Supabase client per space with its own storage key, so a session opened
 * in one space is never shared with another (isolated sessions per subdomain).
 */
export function getSpaceClient(space: SpaceKey): SupabaseClient<Database> {
  const existing = clients[space];
  if (existing) return existing;

  const client = createClient<Database>(
    import.meta.env["VITE_SUPABASE_URL"] as string,
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string,
    {
      auth: {
        storageKey: `madauros-${space}-auth`,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: false,
      },
    },
  );
  clients[space] = client;
  return client;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "في انتظار المصادقة",
  approved: "مصادق عليه",
  rejected: "مرفوض",
};

export const SPACE_LABEL: Record<SpaceKey, string> = {
  talameed: "تلميذ",
  taleem: "أستاذ",
  admin: "إداري",
};
