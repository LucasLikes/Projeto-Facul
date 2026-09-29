import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const codeSchema = z.string().min(1).max(2048);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = codeSchema.safeParse(url.searchParams.get("code"));
  if (!code.success) return NextResponse.redirect(new URL("/painel/login?erro=link-invalido", url));
  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/painel/login?erro=indisponivel", url));
  const { error } = await supabase.auth.exchangeCodeForSession(code.data);
  return NextResponse.redirect(new URL(error ? "/painel/login?erro=link-invalido" : "/painel", url));
}