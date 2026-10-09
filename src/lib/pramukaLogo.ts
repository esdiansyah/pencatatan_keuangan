/**
 * Logo Resmi Tunas Kelapa Gerakan Pramuka
 * Disesuaikan presisi dengan siluet resmi lambang Pramuka Indonesia
 */

export const PRAMUKA_PATH_DATA = [
  "M 65 470", // Ujung paruh lancip buah kelapa sebelah kiri bawah
  "C 75 430, 105 390, 150 380", // Busur atas buah kelapa menuju pangkal tunas
  "C 190 370, 230 385, 248 420", // Kelapa bersatu dengan tunas di kanan
  "C 244 380, 236 320, 230 270", // Batang tunas ramping naik
  "C 224 220, 212 160, 204 118", // Pangkal daun kiri
  "C 200 98, 196 82, 195 72",    // Ujung tajam daun kiri
  "C 202 92, 216 132, 226 164",  // Tepi dalam daun kiri menuju belahan V
  "C 229 172, 232 176, 235 176", // Dasar belahan V di antara dua daun
  "C 238 172, 240 130, 242 80",   // Tepi dalam daun kanan menjulang ke atas
  "C 244 38, 245 12, 245 4",      // Ujung daun kanan tertinggi
  "C 248 20, 260 75, 270 135",    // Lengkungan luar daun kanan
  "C 282 205, 288 275, 280 345",  // Pinggang luar batang tunas
  "C 274 395, 270 445, 272 485",  // Sisi kanan melewati badan kelapa
  "C 274 520, 280 560, 288 592",  // Akar menjuntai ke bawah
  "C 284 598, 278 596, 274 578",  // Ujung akar
  "C 268 542, 266 508, 266 478",  // Sisi dalam akar menyatu ke kelapa
  "C 256 508, 236 538, 206 556",  // Lengkungan bawah kelapa
  "C 162 578, 118 564, 88 528",   // Sisi kiri bawah kelapa
  "C 72 504, 65 484, 65 470",     // Kembali ke ujung lancip kelapa
  "Z"
].join(" ");

export const PRAMUKA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 620" width="340" height="620">
  <path fill="#000000" d="${PRAMUKA_PATH_DATA}"/>
</svg>`;

/**
 * Menghasilkan Data URL PNG resolusi tinggi dari Logo Tunas Kelapa
 * secara sinkron & andal menggunakan HTML5 Canvas Path2D
 */
export const getPramukaLogoDataUrl = (): string => {
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 340;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Bersihkan canvas dengan latar transparan
    ctx.clearRect(0, 0, 340, 620);
    ctx.fillStyle = '#000000';

    if (typeof Path2D !== 'undefined') {
      const p = new Path2D(PRAMUKA_PATH_DATA);
      ctx.fill(p);
    } else {
      // Fallback
      ctx.beginPath();
      ctx.arc(170, 470, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Gagal membuat logo data url:', err);
    return '';
  }
};
