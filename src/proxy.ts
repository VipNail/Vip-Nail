// Comprobación rápida: sin cookie de sesión, /crm manda a /entrar.
// No es la seguridad real (eso lo hace exigirEquipo() en servidor), solo evita una ida y vuelta.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/crm/:path*", "/crm"] };
