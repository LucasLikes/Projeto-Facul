import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation";

const bodySchema = z.object({ email: signInSchema.shape.email });

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "invalid_request", "Informe um e-mail válido.");
  const supabase = await getServerSupabase();
  if (!supabase) return apiError(503, "auth_unconfigured", "Configure as variáveis do Supabase para habilitar o painel.");
  const baseUrl = getEnv("NEXT_PUBLIC_APP_URL") ?? new URL(request.url).origin;
  const { error } = await supabase.auth.signInWithOtp({
    email: body.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: `${baseUrl}/auth/callback` },
  });
  if (error) return apiError(400, "email_not_allowed", "Não foi possível enviar o link. Confirme se este e-mail tem acesso à arena.");
  return NextResponse.json({ enviado: true });
}