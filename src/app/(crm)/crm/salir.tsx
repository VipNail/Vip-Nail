"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function BotonSalir() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm underline underline-offset-4"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/entrar");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
