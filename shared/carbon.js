// Kalkulator karbon setoran Bank Sampah (BSIL).
// Metodologi: EPA Waste Reduction Model (WARM) versi 16, Desember 2023, faktor emisi bersih per material
// (MTCO2E per short ton), Exhibit 1-1 dokumen "Management Practices Chapters" v16.
// Emisi dihindari = emisi jika ditimbun di TPA (landfilling) - emisi jika didaur ulang (recycling).
// Catatan: ReCon (Recycled Content) EPA menghitung pembelian bahan berkonten daur ulang, bukan pengelolaan sampah;
// untuk setoran sampah yang dipakai adalah WARM. Faktor WARM memakai kondisi TPA Amerika Serikat; hasil di sini perkiraan.
export const CARBON_SOURCE = {
  name: 'EPA WARM versi 16 (Desember 2023)',
  url: 'https://www.epa.gov/waste-reduction-model',
  basis: 'Daur ulang dibandingkan penimbunan di TPA',
};
export const SHORT_TON_KG = 907.18474;
// recycling dan landfill dalam MTCO2E per short ton (negatif = penyerapan/penghematan bersih)
export const CARBON_FACTORS = {
  Plastik: { warm: 'Mixed Plastics', recycling: -0.93, landfill: 0.02 },
  Kertas: { warm: 'Mixed Paper (general)', recycling: -3.55, landfill: 0.07 },
  Logam: { warm: 'Mixed Metals', recycling: -4.39, landfill: 0.02 },
  Kaca: { warm: 'Glass', recycling: -0.28, landfill: 0.02 },
};
/** kg CO2e yang dihindari per 1 kg material yang disetor untuk didaur ulang. */
export const factorPerKg = (mat) => {
  const f = CARBON_FACTORS[mat];
  return f ? ((f.landfill - f.recycling) * 1000) / SHORT_TON_KG : 0;
};
/** kg CO2e yang dihindari untuk setoran `kg` kilogram material `mat`. */
export const co2e = (mat, kg) => (Number(kg) > 0 ? Number(kg) * factorPerKg(mat) : 0);
/** Ringkasan per material dari daftar setoran [{mat, kg}]. */
export const carbonByMaterial = (trx = []) => {
  const rows = Object.keys(CARBON_FACTORS).map((mat) => {
    const kg = trx.filter((t) => t.mat === mat).reduce((s, t) => s + Number(t.kg || 0), 0);
    return { mat, kg, co2e: co2e(mat, kg), perKg: factorPerKg(mat) };
  });
  return { rows, kg: rows.reduce((s, r) => s + r.kg, 0), total: rows.reduce((s, r) => s + r.co2e, 0) };
};
