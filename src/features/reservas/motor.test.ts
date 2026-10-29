// Pruebas del motor de huecos y de las horas de Madrid. Ejecutar: npm test
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calcularHuecos, type EntradaMotor } from "./motor";
import { aHora, aMinutos, diaSemana, fechaMadrid, horaMadrid, localAUtc, madridAUtc, sumarDias } from "./tiempo";

const iso = (d: Date) => d.toISOString().slice(0, 16) + "Z";
const horas = (hs: { inicio: Date }[]) => hs.map((h) => horaMadrid(h.inicio));

describe("hora de Madrid", () => {
  test("invierno (+1) y verano (+2)", () => {
    assert.equal(iso(madridAUtc("2026-11-02", 10 * 60)), "2026-11-02T09:00Z");
    assert.equal(iso(madridAUtc("2026-07-15", 10 * 60)), "2026-07-15T08:00Z");
  });
  test("día del cambio de octubre (25/10/2026)", () => {
    assert.equal(iso(madridAUtc("2026-10-25", 0)), "2026-10-24T22:00Z"); // aún verano
    assert.equal(iso(madridAUtc("2026-10-25", 10 * 60)), "2026-10-25T09:00Z"); // ya invierno
    // 02:30 existe dos veces: gana la primera (verano)
    assert.equal(iso(madridAUtc("2026-10-25", 150)), "2026-10-25T00:30Z");
  });
  test("día del cambio de marzo (29/03/2026)", () => {
    assert.equal(iso(madridAUtc("2026-03-29", 0)), "2026-03-28T23:00Z");
    assert.equal(iso(madridAUtc("2026-03-29", 10 * 60)), "2026-03-29T08:00Z");
    // 02:30 no existe: se toma el desfase de antes del cambio
    assert.equal(iso(madridAUtc("2026-03-29", 150)), "2026-03-29T01:30Z");
  });
  test("utilidades", () => {
    assert.equal(diaSemana("2026-11-02"), 1); // lunes
    assert.equal(diaSemana("2026-11-08"), 7); // domingo
    assert.equal(fechaMadrid(new Date("2026-10-28T23:30:00Z")), "2026-10-29");
    assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
    assert.equal(aMinutos("09:30"), 570);
    assert.equal(aMinutos("24:00"), null);
    assert.equal(aHora(1215), "20:15");
    assert.equal(iso(localAUtc("2026-11-02T16:00")!), "2026-11-02T15:00Z");
    assert.equal(localAUtc("2026-02-30T10:00"), null);
  });
});

// Lunes 2 de noviembre de 2026, Ana trabaja de 10:00 a 14:00.
function base(cambios: Partial<EntradaMotor> = {}): EntradaMotor {
  return {
    fecha: "2026-11-02",
    servicio: { duracionMin: 60, margenMin: 0 },
    profesionales: [{ staffId: "ana", horario: [{ diaSemana: 1, inicioMin: 600, finMin: 840 }] }],
    citas: [],
    bloqueos: [],
    ajustes: { antelacionMinMin: 0, ventanaMaxDias: 60, pasoMin: 30 },
    ahora: new Date("2026-10-29T08:00:00Z"),
    ...cambios,
  };
}
const t = (fecha: string, hhmm: string) => madridAUtc(fecha, aMinutos(hhmm)!);

describe("motor de huecos", () => {
  test("día libre: huecos cada «paso» y el servicio acaba antes del cierre", () => {
    assert.deepEqual(horas(calcularHuecos(base())), ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"]);
  });

  test("día sin horario: ningún hueco", () => {
    assert.deepEqual(calcularHuecos(base({ fecha: "2026-11-03" })), []);
  });

  test("varias franjas (mañana y tarde)", () => {
    const h = calcularHuecos(
      base({
        profesionales: [
          {
            staffId: "ana",
            horario: [
              { diaSemana: 1, inicioMin: 600, finMin: 720 },
              { diaSemana: 1, inicioMin: 960, finMin: 1080 },
            ],
          },
        ],
      }),
    );
    assert.deepEqual(horas(h), ["10:00", "10:30", "11:00", "16:00", "16:30", "17:00"]);
  });

  test("cita existente con margen de limpieza", () => {
    const h = calcularHuecos(
      base({
        servicio: { duracionMin: 60, margenMin: 15 },
        ajustes: { antelacionMinMin: 0, ventanaMaxDias: 60, pasoMin: 15 },
        citas: [{ staffId: "ana", inicio: t("2026-11-02", "11:00"), fin: t("2026-11-02", "12:00"), margenMin: 15 }],
      }),
    );
    // 10:00 no cabe: 60 min + 15 de limpieza chocan con la cita de las 11:00.
    // La cita de las 11:00 deja libre a las 12:15 (su margen).
    assert.deepEqual(horas(h), ["12:15", "12:30", "12:45", "13:00"]);
  });

  test("la última cita del día puede acabar justo al cierre aunque tenga margen", () => {
    const h = calcularHuecos(base({ servicio: { duracionMin: 60, margenMin: 15 } }));
    assert.equal(horas(h).at(-1), "13:00");
  });

  test("bloqueo de la persona y bloqueo de todo el estudio", () => {
    const deAna = calcularHuecos(
      base({ bloqueos: [{ staffId: "ana", inicio: t("2026-11-02", "10:00"), fin: t("2026-11-02", "12:00") }] }),
    );
    assert.deepEqual(horas(deAna), ["12:00", "12:30", "13:00"]);

    const estudio = calcularHuecos(
      base({ bloqueos: [{ staffId: null, inicio: t("2026-11-01", "00:00"), fin: t("2026-11-03", "00:00") }] }),
    );
    assert.deepEqual(estudio, []);

    const deOtra = calcularHuecos(
      base({ bloqueos: [{ staffId: "eva", inicio: t("2026-11-02", "10:00"), fin: t("2026-11-02", "14:00") }] }),
    );
    assert.equal(deOtra.length, 7);
  });

  test("antelación mínima", () => {
    const h = calcularHuecos(
      base({
        servicio: { duracionMin: 30, margenMin: 0 },
        ajustes: { antelacionMinMin: 120, ventanaMaxDias: 60, pasoMin: 15 },
        ahora: t("2026-11-02", "11:10"),
      }),
    );
    assert.deepEqual(horas(h), ["13:15", "13:30"]);
  });

  test("ventana máxima de reserva", () => {
    const ajustes = { antelacionMinMin: 0, ventanaMaxDias: 4, pasoMin: 30 };
    assert.equal(calcularHuecos(base({ ajustes })).length, 7); // 29/10 + 4 = 02/11, último día válido
    assert.deepEqual(calcularHuecos(base({ ajustes: { ...ajustes, ventanaMaxDias: 3 } })), []);
  });

  test("sin preferencia: une a varias profesionales en cada hora", () => {
    const h = calcularHuecos(
      base({
        profesionales: [
          { staffId: "ana", horario: [{ diaSemana: 1, inicioMin: 600, finMin: 720 }] },
          { staffId: "eva", horario: [{ diaSemana: 1, inicioMin: 660, finMin: 780 }] },
        ],
      }),
    );
    assert.deepEqual(
      h.map((x) => `${horaMadrid(x.inicio)} ${x.staffIds.join("+")}`),
      ["10:00 ana", "10:30 ana", "11:00 ana+eva", "11:30 eva", "12:00 eva"],
    );
  });

  test("cambio de hora de una cita: no choca consigo misma", () => {
    const citas = [{ id: "c1", staffId: "ana", inicio: t("2026-11-02", "10:00"), fin: t("2026-11-02", "14:00"), margenMin: 0 }];
    assert.deepEqual(calcularHuecos(base({ citas })), []);
    assert.equal(calcularHuecos(base({ citas, ignorarCitaId: "c1" })).length, 7);
  });

  test("días de cambio de hora", () => {
    const domingo = (fecha: string) =>
      calcularHuecos(
        base({
          fecha,
          ahora: new Date("2026-03-01T00:00:00Z"),
          ajustes: { antelacionMinMin: 0, ventanaMaxDias: 400, pasoMin: 60 },
          profesionales: [{ staffId: "ana", horario: [{ diaSemana: 7, inicioMin: 600, finMin: 720 }] }],
        }),
      ).map((x) => iso(x.inicio));
    assert.deepEqual(domingo("2026-03-29"), ["2026-03-29T08:00Z", "2026-03-29T09:00Z"]);
    assert.deepEqual(domingo("2026-10-25"), ["2026-10-25T09:00Z", "2026-10-25T10:00Z"]);
  });

  test("servicio más largo que la franja: ningún hueco", () => {
    assert.deepEqual(calcularHuecos(base({ servicio: { duracionMin: 300, margenMin: 0 } })), []);
  });
});
