"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Aviso, Boton, Campo, Selector } from "@/components/ui/campo";
import type { Rol } from "@/db/schema";
import { crearPersona, editarPersona, type EstadoFormulario } from "@/features/equipo/acciones";
import { DESCRIPCION_ROL, NOMBRE_ROL } from "@/lib/permisos";

type Persona = { id: string; nombre: string; email: string; rol: Rol; colorAgenda: string };

// Colores de agenda sugeridos (paleta corporativa y tonos que se distinguen bien entre sí).
// El orden de los roles es el de NOMBRE_ROL (no se importa el esquema en el navegador).
const ROLES = Object.keys(NOMBRE_ROL) as Rol[];

const COLORES = ["#123C36", "#7F9A8D", "#C7A84E", "#9B5C6B", "#4F6D8F", "#B4734A", "#6B5B95", "#1C1C1C"];

export function FormularioPersona({ persona, esYo = false }: { persona?: Persona; esYo?: boolean }) {
  const editando = Boolean(persona);
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    editando ? editarPersona : crearPersona,
    {},
  );
  const [rol, setRol] = useState<Rol>(persona?.rol ?? "profesional");
  const [color, setColor] = useState(persona?.colorAgenda ?? COLORES[1]);

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && <Aviso>{estado.error}</Aviso>}
      {persona && <input type="hidden" name="id" value={persona.id} />}

      <Campo etiqueta="Nombre" name="nombre" defaultValue={persona?.nombre} autoComplete="off" required />
      <Campo etiqueta="Email" name="email" type="email" defaultValue={persona?.email} autoComplete="off" required />

      <div className="flex flex-col gap-1">
        <Selector
          etiqueta="Rol"
          name="rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          disabled={esYo && persona?.rol === "admin"}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </Selector>
        {/* Un select desactivado no se envía: se manda el valor aparte. */}
        {esYo && persona?.rol === "admin" && <input type="hidden" name="rol" value={rol} />}
        <p className="text-sm text-texto-suave">
          {DESCRIPCION_ROL[rol]}
          {esYo && persona?.rol === "admin" && " No puedes cambiar tu propio rol."}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Color en la agenda</legend>
        <input type="hidden" name="colorAgenda" value={color} />
        <div className="flex flex-wrap items-center gap-2">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color.toLowerCase() === c.toLowerCase()}
              className={`size-11 rounded-full border-2 ${
                color.toLowerCase() === c.toLowerCase() ? "border-texto ring-2 ring-acento" : "border-superficie"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="flex h-11 items-center gap-2 rounded-full border border-borde px-3 text-sm">
            Otro
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-7 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <Campo
          etiqueta={editando ? "Contraseña nueva (opcional)" : "Contraseña inicial"}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required={!editando}
        />
        <p className="text-sm text-texto-suave">
          {editando
            ? "Déjala vacía para no cambiarla. Si la cambias, se cierra la sesión de esa persona."
            : "Mínimo 10 caracteres. Dásela en persona; podrá entrar con su email y esta contraseña."}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/crm/equipo"
          className="flex h-12 items-center justify-center rounded-full px-6 font-medium text-marca underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Dar de alta"}
        </Boton>
      </div>
    </form>
  );
}
