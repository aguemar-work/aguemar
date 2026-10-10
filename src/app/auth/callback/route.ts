import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Destino del enlace mágico. Soporta el flujo PKCE (?code=) y el de token_hash (?token_hash=&type=).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const siguienteParam = searchParams.get("siguiente") ?? "/panel";
  const siguiente = siguienteParam.startsWith("/") && !siguienteParam.startsWith("//") ? siguienteParam : "/panel";

  const supabase = await crearClienteServidor();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${siguiente}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${siguiente}`);
  }

  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
