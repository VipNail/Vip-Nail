"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function Salir() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  return (
    <button
      type="button"
      disabled={saliendo}
      className="text-sm underline underline-offset-4"
      onClick={async () => {
        setSaliendo(true);
        await authClient.signOut();
        router.replace("/cuenta/entrar");
        router.refresh();
      }}
    >
      {saliendo ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
