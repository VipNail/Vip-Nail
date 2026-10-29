import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { aplicarOferta, cadenaCategorias, euros, leerEuros, precioFinal, type OfertaPrecio } from "./precios";

const ahora = new Date("2026-11-10T12:00:00Z");
const padres = new Map<string, string | null>([
  ["molekula", null],
  ["esmaltes", "molekula"],
  ["staleks", null],
]);
const p = { id: "p1", precio: 1000, categoriaId: "esmaltes" };
const oferta = (o: Partial<OfertaPrecio>): OfertaPrecio => ({
  id: "o",
  nombre: "Oferta",
  productoId: null,
  categoriaId: null,
  tipo: "porcentaje",
  valor: 10,
  inicio: new Date("2026-11-01T00:00:00Z"),
  fin: new Date("2026-11-30T00:00:00Z"),
  ...o,
});

describe("precios", () => {
  test("sin ofertas", () => {
    assert.deepEqual(precioFinal(p, [], padres, ahora), { precio: 1000, original: 1000, oferta: null });
  });
  test("oferta del producto en porcentaje", () => {
    const r = precioFinal(p, [oferta({ productoId: "p1", valor: 15 })], padres, ahora);
    assert.equal(r.precio, 850);
    assert.equal(r.oferta?.porcentaje, 15);
  });
  test("oferta de la categoría superior también vale", () => {
    assert.equal(precioFinal(p, [oferta({ categoriaId: "molekula", valor: 20 })], padres, ahora).precio, 800);
    assert.equal(precioFinal(p, [oferta({ categoriaId: "staleks", valor: 20 })], padres, ahora).precio, 1000);
  });
  test("fechas: antes del inicio y desde el fin no se aplica", () => {
    const o = oferta({ productoId: "p1" });
    assert.equal(precioFinal(p, [o], padres, new Date("2026-10-31T23:59:59Z")).precio, 1000);
    assert.equal(precioFinal(p, [o], padres, new Date("2026-11-30T00:00:00Z")).precio, 1000);
    assert.equal(precioFinal(p, [o], padres, new Date("2026-11-01T00:00:00Z")).precio, 900);
  });
  test("varias ofertas: gana la que deja el precio más bajo", () => {
    const r = precioFinal(
      p,
      [oferta({ id: "a", productoId: "p1", valor: 10 }), oferta({ id: "b", categoriaId: "molekula", tipo: "importe", valor: 300 })],
      padres,
      ahora,
    );
    assert.equal(r.precio, 700);
    assert.equal(r.oferta?.id, "b");
  });
  test("nunca por debajo de cero ni porcentajes raros", () => {
    assert.equal(aplicarOferta(500, { tipo: "importe", valor: 900 }), 0);
    assert.equal(aplicarOferta(500, { tipo: "porcentaje", valor: 150 }), 0);
    assert.equal(aplicarOferta(999, { tipo: "porcentaje", valor: 33 }), 669);
  });
  test("categorías en bucle no cuelgan", () => {
    assert.deepEqual(cadenaCategorias("a", new Map([["a", "b"], ["b", "a"]])), ["a", "b"]);
  });
  test("euros", () => {
    assert.equal(euros(1995).replace(/\s/g, " "), "19,95 €");
    assert.equal(leerEuros("19,95"), 1995);
    assert.equal(leerEuros("19.95"), 1995);
    assert.equal(leerEuros("1.299,5 €"), 129950);
    assert.equal(leerEuros("7"), 700);
    assert.equal(leerEuros("abc"), null);
    assert.equal(leerEuros("-3"), null);
  });
});
