"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso, Boton, Campo } from "@/components/ui/campo";
import { authClient } from "@/lib/auth-client";

export function FormularioEntrar() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
          : "Email o contraseña incorrectos.",
      );
      setEnviando(false);
      return;
    }
    router.replace("/crm");
    router.refresh();
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {error && <Aviso>{error}</Aviso>}
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
  );
}
