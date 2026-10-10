import React, { useState, useMemo } from 'react';
import { useFinancialData } from '../context/FinancialContext';
import { Transaction } from '../lib/storage';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Download, Filter, Calendar, RefreshCw } from 'lucide-react';
import { exportToPDF } from '../lib/pdfExport';

export const Transactions: React.FC = () => {
  const { transactions, config, addTransaction, deleteTransaction, syncStatus } = useFinancialData();
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const monthOptions = [
    { value: 'all', label: 'Semua Transaksi (Sep - Nov 2026)' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-10', label: 'Oktober 2026' },
    { value: '2026-11', label: 'November 2026' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || isNaN(Number(amount))) return;

    try {
      setIsSubmitting(true);
      await addTransaction({
        date,
        description,
        amount: Number(amount),
        type,
      });
      
      // Reset form
      setDescription('');
      setAmount('');
      setShowForm(false);
    } catch (err) {
      alert('Gagal menyimpan transaksi ke cloud. Pastikan perangkat terhubung internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data transaksi ini? Data akan otomatis terhapus di seluruh akun/perangkat.')) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        alert('Gagal menghapus transaksi dari cloud.');
      }
    }
  };

  // Filtered and sorted transactions with running balance
  const processedTransactions = useMemo(() => {
    // 1. Urutkan secara kronologis ASCENDING untuk menghitung running balance
    const sortedAsc = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Hitung saldo awal untuk filter bulan tertentu
    let startingBalance = config.initialBudget;
    if (selectedMonth !== 'all') {
      const prior = sortedAsc.filter((t) => t.date < `${selectedMonth}-01`);
      const priorInc = prior.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const priorExp = prior.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      startingBalance = config.initialBudget + priorInc - priorExp;
    }

    let running = startingBalance;
    const withBalance = sortedAsc.map((t) => {
      if (t.type === 'income') running += t.amount;
      else running -= t.amount;
      return {
        ...t,
        saldo: running,
      };
    });

    // Filter berdasarkan bulan
    if (selectedMonth === 'all') {
      return withBalance;
    }
    return withBalance.filter((t) => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth, config.initialBudget]);

  const summary = useMemo(() => {
    const inc = processedTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const exp = processedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const lastSaldo = processedTransactions.length > 0 
      ? processedTransactions[processedTransactions.length - 1].saldo 
      : config.initialBudget;

    return { inc, exp, lastSaldo };
  }, [processedTransactions, config.initialBudget]);

  const handleExportThisMonth = () => {
    exportToPDF(transactions, {
      monthFilter: selectedMonth,
      initialBudget: config.initialBudget,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Buku Kas & Transaksi</h1>
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Sinkron Cloud
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <RefreshCw size={11} className="animate-spin text-blue-600" />
                Menyinkronkan...
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Pencatatan pengeluaran harian dan pemasukan kegiatan Pramuka (Otomatis Tersinkron Antar Perangkat)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter Bulan */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <Filter size={16} className="text-gray-500 mr-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-gray-700 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportThisMonth}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm gap-2"
            title="Cetak PDF untuk filter yang sedang aktif"
          >
            <Download size={16} />
            <span>Cetak PDF ({selectedMonth === 'all' ? 'Semua' : selectedMonth})</span>
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-medium transition-colors shadow-sm gap-2"
          >
            <Plus size={18} />
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </div>

      {/* Form Input Transaksi Baru */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-emerald-100 mb-6 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Tambah Transaksi Harian
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">
                Tanggal Transaksi
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">
                Jenis Transaksi
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
              >
                <option value="expense">Pengeluaran (Biaya / Belanja)</option>
                <option value="income">Pemasukan (Iuran / Dana / Kas)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">
                Keterangan Transaksi
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Konsumsi Panitia Pesta Penggalang Hari ke-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1.5">
                Jumlah Nominal (Rp)
              </label>
              <input
                type="number"
                required
                min="0"
                step="1000"
                placeholder="Contoh: 250000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Data Kas & Saldo Berjalan */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-emerald-800 text-white border-b border-emerald-900">
              <tr>
                <th className="px-4 py-3.5 font-semibold text-center w-12">No</th>
                <th className="px-4 py-3.5 font-semibold text-center w-28">Tanggal</th>
                <th className="px-4 py-3.5 font-semibold">Keterangan</th>
                <th className="px-4 py-3.5 font-semibold text-center w-28">Jenis</th>
                <th className="px-4 py-3.5 font-semibold text-right w-36">Pemasukan</th>
                <th className="px-4 py-3.5 font-semibold text-right w-36">Pengeluaran</th>
                <th className="px-4 py-3.5 font-semibold text-right w-36 bg-emerald-900">Saldo</th>
                <th className="px-4 py-3.5 font-semibold text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedTransactions.length > 0 ? (
                processedTransactions.map((t, index) => (
                  <tr key={t.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-xs">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-gray-700">
                      {format(parseISO(t.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3.5 text-gray-800 font-medium">
                      {t.description}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          t.type === 'income'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t.type === 'income' ? (
                          <>
                            <ArrowUpCircle size={13} className="mr-1 text-emerald-600" /> Masuk
                          </>
                        ) : (
                          <>
                            <ArrowDownCircle size={13} className="mr-1 text-red-600" /> Keluar
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium text-emerald-700">
                      {t.type === 'income' ? formatRupiah(t.amount) : '-'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium text-red-600">
                      {t.type === 'expense' ? formatRupiah(t.amount) : '-'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-gray-900 bg-gray-50/50">
                      {formatRupiah(t.saldo)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Hapus Transaksi"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <Calendar className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    Belum ada catatan transaksi pada bulan ini. Silakan klik tombol "Tambah Transaksi".
                  </td>
                </tr>
              )}
            </tbody>
            {/* Footer Tabel dengan Sisa Saldo Akhir Paling Bawah */}
            <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-gray-600 uppercase text-xs tracking-wider">
                  Total Mutasi Transaksi
                </td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {formatRupiah(summary.inc)}
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {formatRupiah(summary.exp)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 bg-gray-100/60">-</td>
                <td></td>
              </tr>
              <tr className="bg-emerald-50/70 border-t border-emerald-100">
                <td colSpan={6} className="px-4 py-3 text-right text-emerald-950 font-extrabold uppercase text-xs tracking-wider">
                  Sisa Saldo Kas Akhir
                </td>
                <td className="px-4 py-3 text-right text-emerald-800 font-extrabold text-base bg-emerald-100/60">
                  {formatRupiah(summary.lastSaldo)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
