import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { pedidoConCurso } from "@/features/cuenta/acciones";
import { leerEnlace } from "@/features/cuenta/cuenta";
import { FormularioActivar } from "./formulario";

export const metadata: Metadata = { title: "Crea tu contraseña", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Activar({ searchParams }: PageProps<"/cuenta/activar">) {
  const sp = await searchParams;
  const e = typeof sp.e === "string" ? sp.e : "";
  const n = typeof sp.n === "string" ? sp.n : "";
  const t = typeof sp.t === "string" ? sp.t : "";
  let email: string | null = null;
  let tieneCuenta = false;
  let valido = false;
  if (e) {
    const f = await leerEnlace(e);
    if (f) {
      valido = true;
      email = f.cliente.email;
      tieneCuenta = Boolean(f.cliente.userId);
    }
  } else if (n && t) {
    const p = await pedidoConCurso(n, t);
    if (p && !p.userId) valido = true;
    if (p?.userId) tieneCuenta = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold text-marca">{tieneCuenta && valido ? "Cambia tu contraseña" : "Crea tu contraseña"}</h1>
      {valido ? (
        <>
          <p className="text-sm text-texto-suave">
            Con ella entrarás a tus cursos{email ? (
              <>
                {" "}con el email <strong className="text-texto">{email}</strong>
              </>
            ) : null}
            .
          </p>
          <FormularioActivar ocultos={e ? { e } : { n, t }} />
        </>
      ) : tieneCuenta ? (
        <Aviso tipo="ok">Ya tienes cuenta. Entra con tu email y contraseña.</Aviso>
      ) : (
        <Aviso>Este enlace ya no vale (caducado o ya usado). Pide uno nuevo al estudio.</Aviso>
      )}
      <Link href="/cuenta/entrar" className="text-center text-sm underline underline-offset-4">
        Ir a entrar
      </Link>
    </main>
  );
}
