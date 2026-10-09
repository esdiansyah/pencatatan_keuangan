import React, { useState, useEffect } from 'react';
import { storage } from '../lib/storage';

export const Settings: React.FC = () => {
  const [initialBudget, setInitialBudget] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const config = storage.getConfig();
    setInitialBudget(config.initialBudget.toString());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveConfig({
      initialBudget: Number(initialBudget) || 0,
    });
    setSaveMessage('Pengaturan berhasil disimpan!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
        <p className="text-sm text-gray-500">Konfigurasi anggaran awal kas panitia</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Anggaran Awal / Kas Awal Tersedia (Rp)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Masukkan total dana kas awal kegiatan yang tersedia sebelum adanya mutasi pemasukan atau pengeluaran harian lainnya.
            </p>
            <input
              type="number"
              min="0"
              step="50000"
              value={initialBudget}
              onChange={(e) => setInitialBudget(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-base"
              placeholder="Contoh: 15000000"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-emerald-600 font-medium h-5">
              {saveMessage}
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-colors font-semibold shadow-sm text-sm"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>

      <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 space-y-3">
        <h3 className="text-emerald-900 font-bold text-sm uppercase tracking-wider">
          Standar Format Cetak Laporan PDF
        </h3>
        <p className="text-emerald-800 text-xs">
          Kop surat dan tanda tangan telah disesuaikan dengan ketentuan panitia pelaksana:
        </p>
        <div className="bg-white/80 p-3.5 rounded-xl text-xs text-gray-700 space-y-2 border border-emerald-200/50">
          <div>
            <span className="font-semibold text-gray-900">Format Kop Surat (Resmi):</span>
            <p className="text-gray-700 font-medium">
              • <strong>Logo:</strong> Tunas Kelapa Gerakan Pramuka (Sebelah Kiri)<br />
              • Baris 1: GERAKAN PRAMUKA KWARTIR RANTING MUARA KAMAN<br />
              • Baris 2: PANITIA PELAKSANA PESTA PENGGALANG<br />
              • Baris 3: SMP/MTs KECAMATAN MUARA KAMAN<br />
              • Baris 4: TAHUN 2026 (dipindah ke bawah nama sekolah)
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
            <div>
              <span className="font-semibold text-gray-900">Posisi Kiri (Mengetahui):</span>
              <p className="text-gray-600">Ketua Pelaksana: Sukriansyah, S.Pd (NTA: -)</p>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Posisi Kanan (Penyusun):</span>
              <p className="text-gray-600">Bendahara: Susilawati, S.Pd (NTA: -)</p>
            </div>
          </div>
          <div className="pt-1 border-t border-gray-100">
            <span className="font-semibold text-gray-900">Struktur Tabel & Periode:</span>
            <p className="text-gray-600">
              • Kolom <strong>Saldo</strong> berada di posisi paling kanan.<br />
              • <strong>Sisa Saldo Akhir</strong> berada di baris paling bawah tabel.<br />
              • Cetak dapat dipilih <strong>Per Bulan</strong> (September, Oktober, November) atau <strong>Semua Periode</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
