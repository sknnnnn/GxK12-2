import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeFamiliaPath } from "@/lib/familia/session";

// Destino de los links de email de Supabase Auth (confirmación de registro y
// recuperación de contraseña). Admite el flujo PKCE (?code=) y el de
// token_hash (?token_hash=&type=), según cómo se configuren las plantillas
// de email del proyecto.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeFamiliaPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createSupabaseServerClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/familia?link=invalido", request.url));
}
