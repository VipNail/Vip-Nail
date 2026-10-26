"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Boton, Campo } from "@/components/ui/campo";
import { instalar, type EstadoInstalar } from "./acciones";

export function FormularioInstalar() {
  const [estado, accion, pendiente] = useActionState<EstadoInstalar, FormData>(instalar, {});

  if (estado.ok) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tipo="ok">Cuenta creada. Ya puedes entrar.</Aviso>
        <Link href="/entrar" className="underline underline-offset-4">
          Ir a entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Código de instalación" name="token" type="password" autoComplete="off" required />
      <Campo etiqueta="Nombre" name="nombre" autoComplete="name" required />
      <Campo etiqueta="Email" name="email" type="email" autoComplete="email" required />
      <Campo
        etiqueta="Contraseña (mín. 10 caracteres)"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear cuenta"}
      </Boton>
    </form>
  );
}
