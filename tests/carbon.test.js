import test from 'node:test';
import assert from 'node:assert/strict';
import { co2e, factorPerKg, carbonByMaterial, SHORT_TON_KG } from '../shared/carbon.js';

test('faktor per kg = (TPA - daur ulang) MTCO2E/short ton dikonversi ke kg/kg', () => {
  assert.equal(SHORT_TON_KG, 907.18474);
  assert.ok(Math.abs(factorPerKg('Plastik') - 0.95 * 1000 / 907.18474) < 1e-9);
  assert.ok(Math.abs(factorPerKg('Kertas') - 3.62 * 1000 / 907.18474) < 1e-9);
  assert.ok(Math.abs(factorPerKg('Logam') - 4.41 * 1000 / 907.18474) < 1e-9);
  assert.ok(Math.abs(factorPerKg('Kaca') - 0.30 * 1000 / 907.18474) < 1e-9);
});

test('material tak dikenal dan berat tidak valid menghasilkan 0', () => {
  assert.equal(co2e('Kain', 5), 0);
  assert.equal(co2e('Plastik', -1), 0);
  assert.equal(co2e('Plastik', 'abc'), 0);
});

test('ringkasan per material menjumlah setoran', () => {
  const r = carbonByMaterial([{ mat: 'Kertas', kg: 1 }, { mat: 'Kertas', kg: 2 }, { mat: 'Kaca', kg: 4 }]);
  assert.equal(r.kg, 7);
  assert.ok(Math.abs(r.total - (3 * factorPerKg('Kertas') + 4 * factorPerKg('Kaca'))) < 1e-9);
  assert.equal(r.rows.find((x) => x.mat === 'Logam').co2e, 0);
});
