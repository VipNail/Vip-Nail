import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { importeReserva, leerVimeo, ocupa, plazasLibres, reservable } from "./logica";

describe("academia", () => {
  test("enlaces de Vimeo", () => {
    assert.deepEqual(leerVimeo("https://vimeo.com/123456789"), { id: "123456789", hash: null });
    assert.deepEqual(leerVimeo("https://vimeo.com/123456789/abc123def0"), { id: "123456789", hash: "abc123def0" });
    assert.deepEqual(leerVimeo("https://player.vimeo.com/video/123456789?h=abc123def0&badge=0"), { id: "123456789", hash: "abc123def0" });
    assert.deepEqual(leerVimeo("vimeo.com/manage/videos/123456789/abc123def0"), { id: "123456789", hash: "abc123def0" });
    assert.deepEqual(leerVimeo("123456789"), { id: "123456789", hash: null });
    assert.equal(leerVimeo("https://youtube.com/watch?v=123456789"), null);
    assert.equal(leerVimeo("https://vimeo.com/canal/sin-numero"), null);
    assert.equal(leerVimeo("hola"), null);
  });

  const ahora = new Date("2026-11-10T10:00:00Z");
  const luego = new Date("2026-11-10T10:20:00Z");
  const antes = new Date("2026-11-10T09:40:00Z");

  test("qué plazas ocupan", () => {
    assert.equal(ocupa({ estado: "pagada", caducaAt: null }, ahora), true);
    assert.equal(ocupa({ estado: "senal_pagada", caducaAt: null }, ahora), true);
    assert.equal(ocupa({ estado: "reservada_pendiente", caducaAt: luego }, ahora), true);
    assert.equal(ocupa({ estado: "reservada_pendiente", caducaAt: antes }, ahora), false);
    assert.equal(ocupa({ estado: "cancelada", caducaAt: null }, ahora), false);
  });

  test("plazas libres y reservable", () => {
    const plazas = [
      { estado: "pagada" as const, caducaAt: null },
      { estado: "reservada_pendiente" as const, caducaAt: luego },
      { estado: "reservada_pendiente" as const, caducaAt: antes },
      { estado: "cancelada" as const, caducaAt: null },
    ];
    assert.equal(plazasLibres(4, plazas, ahora), 2);
    assert.equal(plazasLibres(1, plazas, ahora), 0);
    const futuro = new Date("2026-12-01T09:00:00Z");
    assert.equal(reservable({ estado: "abierta", inicio: futuro, plazas: 4 }, plazas, ahora), true);
    assert.equal(reservable({ estado: "abierta", inicio: futuro, plazas: 2 }, plazas, ahora), false);
    assert.equal(reservable({ estado: "cerrada", inicio: futuro, plazas: 9 }, plazas, ahora), false);
    assert.equal(reservable({ estado: "abierta", inicio: antes, plazas: 9 }, plazas, ahora), false);
  });

  test("importe al reservar", () => {
    assert.equal(importeReserva(25000, 5000, "senal"), 5000);
    assert.equal(importeReserva(25000, 5000, "total"), 25000);
    assert.equal(importeReserva(25000, null, "senal"), 25000);
    assert.equal(importeReserva(25000, 30000, "senal"), 25000);
  });
});
