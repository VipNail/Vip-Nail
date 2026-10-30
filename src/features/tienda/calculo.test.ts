import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { costeEnvio, desgloseIva, faltaParaGratis, leerCestaTexto, numeroPedido, totales } from "./calculo";

const A = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const B = "01BX5ZZKBKACTAV9WEVGEMMVRZ";
const domicilio = { precio: 495, gratisDesde: 5000 };
const recogida = { precio: 0, gratisDesde: null };

describe("pedido", () => {
  test("totales con envío y gratis desde un importe", () => {
    const l = [{ precio: 995, cantidad: 2, tipoIva: 21 }, { precio: 1450, cantidad: 1, tipoIva: 21 }];
    assert.deepEqual(totales(l, domicilio), { subtotal: 3440, envio: 495, total: 3935 });
    assert.deepEqual(totales([{ precio: 5000, cantidad: 1, tipoIva: 21 }], domicilio).envio, 0);
    assert.equal(costeEnvio(domicilio, 4999), 495);
    assert.deepEqual(totales(l, recogida), { subtotal: 3440, envio: 0, total: 3440 });
  });
  test("cuánto falta para el envío gratis", () => {
    assert.equal(faltaParaGratis(domicilio, 3440), 1560);
    assert.equal(faltaParaGratis(domicilio, 6000), null);
    assert.equal(faltaParaGratis(recogida, 100), null);
  });
  test("desglose de IVA incluido (por tipo, envío al 21 %)", () => {
    const d = desgloseIva([{ precio: 1210, cantidad: 1, tipoIva: 21 }, { precio: 1100, cantidad: 2, tipoIva: 10 }], 121);
    assert.deepEqual(d, [
      { tipo: 21, base: 1100, cuota: 231 },
      { tipo: 10, base: 2000, cuota: 200 },
    ]);
    assert.equal(d.reduce((t, x) => t + x.base + x.cuota, 0), 1210 + 2200 + 121);
  });
  test("número de pedido", () => {
    assert.equal(numeroPedido(2026, 42), "VN-2026-00042");
  });
  test("cesta de la cookie: sanea, junta repetidos y limita", () => {
    assert.deepEqual(leerCestaTexto(JSON.stringify([[A, 2], [B, 1], [A, 3]])), [[A, 5], [B, 1]]);
    assert.deepEqual(leerCestaTexto(JSON.stringify([[A, 500]])), [[A, 99]]);
    assert.deepEqual(leerCestaTexto(JSON.stringify([["corto", 1], [A, -1], [A, "x"], 7])), []);
    assert.deepEqual(leerCestaTexto("{roto"), []);
    assert.deepEqual(leerCestaTexto(undefined), []);
  });
});
