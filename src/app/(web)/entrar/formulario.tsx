"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Aviso, Boton, Campo } from "@/components/ui/campo";
import { authClient } from "@/lib/auth-client";

// Errores con los que vuelve Google (?error=…) en lenguaje llano.
const ERRORES_GOOGLE: Record<string, string> = {
  signup_disabled: "Ese email de Google no está dado de alta en el equipo. Pide a administración que te dé de alta con ese mismo email.",
  CUENTA_DESACTIVADA: "Tu cuenta está desactivada. Habla con administración.",
  access_denied: "Has cancelado el acceso con Google.",
};

export function FormularioEntrar({ google }: { google: boolean }) {
  const router = useRouter();
  const errorGoogle = useSearchParams().get("error");
  const [error, setError] = useState<string | null>(
    errorGoogle ? (ERRORES_GOOGLE[errorGoogle] ?? "No se pudo entrar con Google. Prueba otra vez.") : null,
  );
  const [enviando, setEnviando] = useState(false);

  async function enviar(datos: FormData) {
    setEnviando(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(datos.get("email") ?? "").trim(),
      password: String(datos.get("password") ?? ""),
      rememberMe: true,
    });
    if (error) {
      setError(
        error.status === 429
          ? "Demasiados intentos. Espera un minuto y vuelve a probar."
          : error.code === "CUENTA_DESACTIVADA"
            ? ERRORES_GOOGLE.CUENTA_DESACTIVADA
            : "Email o contraseña incorrectos.",
      );
      setEnviando(false);
      return;
    }
    router.replace("/crm");
    router.refresh();
  }

  async function conGoogle() {
    setEnviando(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/crm",
      errorCallbackURL: "/entrar",
    });
    // Si todo va bien el navegador ya se ha ido a Google; solo llegamos aquí si falla al salir.
    if (error) {
      setError("No se pudo conectar con Google. Prueba otra vez.");
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Aviso>{error}</Aviso>}

      {google && (
        <>
          <button
            type="button"
            onClick={conGoogle}
            disabled={enviando}
            className="flex h-12 items-center justify-center gap-3 rounded-full border border-borde bg-superficie px-6 font-medium text-texto hover:border-marca disabled:opacity-50"
          >
            <svg aria-hidden viewBox="0 0 48 48" className="size-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Entrar con Google
          </button>
          <div className="flex items-center gap-3 text-sm text-texto-suave">
            <span className="h-px flex-1 bg-borde" />o con tu email<span className="h-px flex-1 bg-borde" />
          </div>
        </>
      )}

      <form action={enviar} className="flex flex-col gap-4">
        <Campo etiqueta="Email" name="email" type="email" autoComplete="email" required />
        <Campo
          etiqueta="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Boton>
      </form>
    </div>
  );
}
