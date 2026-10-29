/** «Esmalte Gel Nº 5 — Rosa» → «esmalte-gel-n-5-rosa» */
export function aSlug(texto: string, largo = 120): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, largo)
      .replace(/-+$/g, "") || "x"
  );
}

/** Escapa % y _ para usar el texto dentro de un LIKE. */
export function patronLike(texto: string): string {
  return `%${texto.trim().replace(/[%_\\]/g, "\\$&")}%`;
}
