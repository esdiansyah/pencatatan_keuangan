import React, { useState, useMemo } from 'react';
import { storage } from '../lib/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Wallet, TrendingDown, TrendingUp, Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { exportToPDF } from '../lib/pdfExport';

export const Dashboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportMonthChoice, setExportMonthChoice] = useState<string>('all');

  const transactions = storage.getTransactions();
  const config = storage.getConfig();

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Month options available for filter & export
  const monthOptions = [
    { value: 'all', label: 'Semua Periode (Sep - Nov 2026)' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-10', label: 'Oktober 2026' },
    { value: '2026-11', label: 'November 2026' },
  ];

  // Financial calculations based on selected month filter
  const balanceInfo = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (selectedMonth === 'all') {
      let totalIncome = config.initialBudget;
      let totalExpense = 0;

      sorted.forEach((t) => {
        if (t.type === 'income') totalIncome += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
      });

      return {
        startingBalance: config.initialBudget,
        incomeInPeriod: totalIncome,
        expenseInPeriod: totalExpense,
        remaining: totalIncome - totalExpense,
        periodLabel: 'Semua Periode (Sep - Nov 2026)',
      };
    } else {
      // Prior transactions to calculate starting balance
      const prior = sorted.filter((t) => t.date < `${selectedMonth}-01`);
      const priorIncome = prior
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const priorExpense = prior
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const startingBalance = config.initialBudget + priorIncome - priorExpense;

      const current = sorted.filter((t) => t.date.startsWith(selectedMonth));
      const incomeInPeriod = current
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenseInPeriod = current
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthLabel =
        monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;

      return {
        startingBalance,
        incomeInPeriod,
        expenseInPeriod,
        remaining: startingBalance + incomeInPeriod - expenseInPeriod,
        periodLabel: monthLabel,
      };
    }
  }, [transactions, config.initialBudget, selectedMonth]);

  // Chart data: chronological cumulative expenses
  const chartData = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const filtered =
      selectedMonth === 'all'
        ? sorted
        : sorted.filter((t) => t.date.startsWith(selectedMonth));

    let cumulativeExpense = 0;
    const dataPoints: Record<string, number> = {};

    filtered.forEach((t) => {
      if (t.type === 'expense') {
        const dateKey = format(parseISO(t.date), 'dd MMM', { locale: id });
        cumulativeExpense += t.amount;
        dataPoints[dateKey] = cumulativeExpense;
      }
    });

    return Object.entries(dataPoints).map(([date, amount]) => ({
      date,
      Pengeluaran: amount,
    }));
  }, [transactions, selectedMonth]);

  const handleExportPDF = (monthToExport: string) => {
    exportToPDF(transactions, {
      monthFilter: monthToExport,
      initialBudget: config.initialBudget,
    });
    setShowExportModal(false);
  };

  // CSV/Excel export utility
  const handleExportCSV = (monthToExport: string) => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const filtered =
      monthToExport === 'all'
        ? sorted
        : sorted.filter((t) => t.date.startsWith(monthToExport));

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'LAPORAN KEUANGAN PESTA PENGGALANG SMP/MTs KEC. MUARA KAMAN TAHUN 2026\n';
    csvContent += `Periode: ${monthToExport === 'all' ? 'Sep - Nov 2026' : monthToExport}\n\n`;
    csvContent += 'No,Tanggal,Keterangan,Jenis,Pemasukan (Rp),Pengeluaran (Rp),Saldo (Rp)\n';

    let currentBalance = config.initialBudget;
    if (monthToExport !== 'all') {
      const prior = sorted.filter((t) => t.date < `${monthToExport}-01`);
      const priorInc = prior.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const priorExp = prior.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      currentBalance = config.initialBudget + priorInc - priorExp;
      csvContent += `-,Saldo Awal Bulan,-,-,-,-,${currentBalance}\n`;
    }

    filtered.forEach((t, idx) => {
      if (t.type === 'income') currentBalance += t.amount;
      else currentBalance -= t.amount;

      const inc = t.type === 'income' ? t.amount : 0;
      const exp = t.type === 'expense' ? t.amount : 0;
      csvContent += `${idx + 1},${t.date},"${t.description.replace(/"/g, '""')}",${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},${inc},${exp},${currentBalance}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_Pramuka_${monthToExport}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-1">
            Kegiatan Pramuka 2026
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Keuangan</h1>
          <p className="text-sm text-gray-500">
            Panitia Pelaksana Pesta Penggalang SMP/MTs Kec. Muara Kaman
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filter Bulan */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
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

          {/* Tombol Buka Modal Ekspor PDF */}
          <button
            onClick={() => {
              setExportMonthChoice(selectedMonth);
              setShowExportModal(true);
            }}
            className="flex items-center justify-center px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition-all shadow-sm font-medium text-sm gap-2"
          >
            <Download size={18} />
            <span>Cetak PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pemasukan / Saldo Awal */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {selectedMonth === 'all'
                  ? 'Total Anggaran & Pemasukan'
                  : 'Pemasukan Bulan Ini'}
              </p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-2">
                {formatRupiah(balanceInfo.incomeInPeriod)}
              </p>
              {selectedMonth !== 'all' && (
                <p className="text-xs text-gray-500 mt-1">
                  Saldo Awal Bulan: {formatRupiah(balanceInfo.startingBalance)}
                </p>
              )}
            </div>
            <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-xs text-emerald-600 font-medium">
            <span>{balanceInfo.periodLabel}</span>
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {selectedMonth === 'all'
                  ? 'Total Pengeluaran'
                  : 'Pengeluaran Bulan Ini'}
              </p>
              <p className="text-2xl font-extrabold text-red-600 mt-2">
                {formatRupiah(balanceInfo.expenseInPeriod)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tercatat pada buku kas
              </p>
            </div>
            <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-xs text-red-600 font-medium">
            <span>Terpantau secara aktual</span>
          </div>
        </div>

        {/* Sisa Anggaran */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Sisa Anggaran / Kas Tersedia
              </p>
              <p className="text-2xl font-extrabold text-blue-700 mt-2">
                {formatRupiah(balanceInfo.remaining)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Saldo akhir periode
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-xs text-blue-600 font-medium">
            <span>Kondisi keuangan saat ini</span>
          </div>
        </div>
      </div>

      {/* Real-time Budget & Expense Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Grafik Pemantauan Pengeluaran Kumulatif
            </h2>
            <p className="text-xs text-gray-500">
              Pemantauan pengeluaran harian ({balanceInfo.periodLabel})
            </p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
            Real-time Tracker
          </span>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 25, bottom: 5, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(val) =>
                    `Rp ${(val / 1000000).toFixed(1)}Jt`
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: any) => [
                    formatRupiah(Number(value) || 0),
                    'Akumulasi Pengeluaran',
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Pengeluaran"
                  name="Akumulasi Pengeluaran"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#dc2626' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#dc2626' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Calendar size={36} className="text-gray-300 mb-2" />
              <p className="text-sm">
                Belum ada pengeluaran yang tercatat pada periode ini.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Dialog Pilihan Cetak PDF Per Bulan */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                  PDF
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Cetak Laporan Keuangan
                  </h3>
                  <p className="text-xs text-gray-500">
                    Pilih periode laporan yang ingin dicetak
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Pilih Periode / Bulan
              </label>

              <div className="space-y-2">
                {monthOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      exportMonthChoice === opt.value
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="exportMonth"
                        value={opt.value}
                        checked={exportMonthChoice === opt.value}
                        onChange={() => setExportMonthChoice(opt.value)}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    {opt.value !== 'all' && (
                      <span className="text-xs text-gray-400">Per Bulan</span>
                    )}
                  </label>
                ))}
              </div>

              {/* Info spesifikasi kop dan penandatangan */}
              <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-800">Format Resmi Laporan:</p>
                <p>• <strong>Logo:</strong> Tunas Kelapa Gerakan Pramuka di sebelah kiri Kop</p>
                <p>• <strong>Kop:</strong> Gerakan Pramuka Kwarran Muara Kaman, Panitia Pelaksana Pesta Penggalang, SMP/MTs Kec. Muara Kaman, Tahun 2026</p>
                <p>• <strong>Tanda Tangan:</strong> Ketua Pelaksana (Kiri) & Bendahara (Kanan)</p>
                <p>• <strong>Tabel:</strong> Kolom Saldo paling kanan & Sisa Saldo Akhir di baris terbawah</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleExportCSV(exportMonthChoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                title="Ekspor sebagai spreadsheet CSV"
              >
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span>Unduh Excel/CSV</span>
              </button>

              <button
                onClick={() => handleExportPDF(exportMonthChoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Download size={16} />
                <span>Unduh Dokumen PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
