// Se ejecuta antes de cada petición:
// 1) Quien entra por «www.» se redirige al dominio sin www (una sola dirección = un solo login y mejor SEO).
// 2) Sin cookie de sesión, /crm manda a /entrar. No es la seguridad real (eso lo hace
//    exigirEquipo() en servidor), solo evita una ida y vuelta.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Hostinger va detrás de un proxy: el dominio real llega en x-forwarded-host.
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (host.startsWith("www.")) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`https://${host.slice(4)}${pathname}${search}`, 308);
  }

  const { pathname } = request.nextUrl;
  if ((pathname === "/crm" || pathname.startsWith("/crm/")) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

// Todo salvo los archivos estáticos de Next y el favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
