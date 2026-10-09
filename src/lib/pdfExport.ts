import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from './storage';
import { LOGO_PRAMUKA_DATA_URI } from './logoBase64';

export interface ExportPdfOptions {
  monthFilter?: string; // 'all' or '2026-09', '2026-10', '2026-11' etc.
  monthLabel?: string; // e.g. 'September 2026'
  initialBudget: number;
}

export const exportToPDF = (
  transactions: Transaction[],
  options: ExportPdfOptions
) => {
  const { monthFilter = 'all', initialBudget } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 1. Urutkan semua transaksi secara kronologis ASCENDING (tanggal terlama ke terbaru)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 2. Hitung Saldo Awal dan Filter data berdasarkan bulan yang dipilih
  let targetTransactions: Transaction[] = [];
  let startingBalance = 0;
  let reportPeriodTitle = 'PERIODE: SEPTEMBER - NOVEMBER 2026';
  let fileName = 'Laporan_Keuangan_Pesta_Penggalang_2026.pdf';

  if (monthFilter === 'all') {
    targetTransactions = sortedTransactions;
    startingBalance = initialBudget;
    reportPeriodTitle = 'PERIODE: SEPTEMBER - NOVEMBER 2026';
    fileName = 'Laporan_Keuangan_Pesta_Penggalang_Sep-Nov_2026.pdf';
  } else {
    // Transaksi sebelum bulan ini untuk menghitung saldo awal (carry-over)
    const priorTransactions = sortedTransactions.filter(
      (t) => t.date < `${monthFilter}-01`
    );
    const priorIncome = priorTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const priorExpense = priorTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    startingBalance = initialBudget + priorIncome - priorExpense;

    // Transaksi di bulan yang dipilih
    targetTransactions = sortedTransactions.filter((t) =>
      t.date.startsWith(monthFilter)
    );

    const [yearStr, monthStr] = monthFilter.split('-');
    const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const formattedMonth = format(dateObj, 'MMMM yyyy', { locale: id }).toUpperCase();

    reportPeriodTitle = `BULAN: ${formattedMonth}`;
    fileName = `Laporan_Keuangan_Pesta_Penggalang_${monthFilter}.pdf`;
  }

  // --- KOP SURAT RESMI PRAMUKA DENGAN LOGO AI TUNAS KELAPA DI SEBELAH KIRI ---
  if (LOGO_PRAMUKA_DATA_URI) {
    try {
      // Logo Tunas Kelapa buatan AI (proporsi 3:4 yang tajam dan presisi)
      doc.addImage(LOGO_PRAMUKA_DATA_URI, 'JPEG', 16, 9.5, 17, 22.7);
    } catch (e) {
      console.warn('Gagal memuat logo AI ke PDF:', e);
    }
  }

  // Titik tengah teks Kop digeser ke tengah dokumen (x = 105) agar presisi center
  const kopTextCenterX = 105;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GERAKAN PRAMUKA KWARTIR RANTING MUARA KAMAN', kopTextCenterX, 14, { align: 'center' });

  doc.setFontSize(13);
  doc.text('PANITIA PELAKSANA PESTA PENGGALANG', kopTextCenterX, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.text('SMP/MTs KECAMATAN MUARA KAMAN', kopTextCenterX, 26, { align: 'center' });

  // "TAHUN 2026" di baris tersendiri di bawah SMP/MTs Kecamatan Muara Kaman
  doc.setFontSize(11);
  doc.text('TAHUN 2026', kopTextCenterX, 31.5, { align: 'center' });

  // Double Line Separator Kop Surat (Garis Ganda Pembatas Resmi)
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(14, 35, 196, 35);
  doc.setLineWidth(0.2);
  doc.line(14, 36, 196, 36);

  // --- JUDUL LAPORAN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN KEUANGAN KAS', 105, 43, { align: 'center' });
  doc.setFontSize(10);
  doc.text(reportPeriodTitle, 105, 48, { align: 'center' });

  const printDateStr = format(new Date(), 'dd MMMM yyyy', { locale: id });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Waktu Cetak: ${printDateStr}`, 14, 54);

  // --- DATA TABEL DENGAN RUNNING SALDO & SISA SALDO AKHIR ---
  let runningBalance = startingBalance;
  let totalIncomeInPeriod = 0;
  let totalExpenseInPeriod = 0;

  const tableRows: any[] = [];

  // Baris Saldo Bulan Lalu jika cetak per bulan atau jika ada saldo awal
  if (monthFilter !== 'all') {
    tableRows.push([
      '-',
      `-`,
      `Saldo Bulan Lalu`,
      '-',
      '-',
      formatRupiah(startingBalance),
    ]);
  } else if (initialBudget > 0) {
    tableRows.push([
      '-',
      `-`,
      `Anggaran Awal Kegiatan`,
      formatRupiah(initialBudget),
      '-',
      formatRupiah(startingBalance),
    ]);
    totalIncomeInPeriod += initialBudget;
  }

  targetTransactions.forEach((t, index) => {
    if (t.type === 'income') {
      runningBalance += t.amount;
      totalIncomeInPeriod += t.amount;
    } else {
      runningBalance -= t.amount;
      totalExpenseInPeriod += t.amount;
    }

    const tglFormatted = format(parseISO(t.date), 'dd/MM/yyyy');
    tableRows.push([
      index + 1,
      tglFormatted,
      t.description,
      t.type === 'income' ? formatRupiah(t.amount) : '-',
      t.type === 'expense' ? formatRupiah(t.amount) : '-',
      formatRupiah(runningBalance),
    ]);
  });

  if (targetTransactions.length === 0 && monthFilter !== 'all') {
    tableRows.push([
      '',
      '',
      '(Tidak ada transaksi pengeluaran/pemasukan pada bulan ini)',
      '-',
      '-',
      formatRupiah(runningBalance),
    ]);
  }

  // Baris Ringkasan Paling Bawah (Footer Tabel) dengan Teks TOTAL MUTASI TRANSAKSI yang tampil jelas
  const tableFoot: any[] = [
    [
      {
        content: 'TOTAL MUTASI TRANSAKSI',
        colSpan: 3,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          textColor: [30, 30, 30],
          fillColor: [240, 243, 246],
        },
      },
      {
        content: formatRupiah(totalIncomeInPeriod),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          textColor: [16, 120, 60],
          fillColor: [240, 243, 246],
        },
      },
      {
        content: formatRupiah(totalExpenseInPeriod),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          textColor: [190, 30, 30],
          fillColor: [240, 243, 246],
        },
      },
      {
        content: '-',
        styles: {
          halign: 'center',
          textColor: [100, 100, 100],
          fillColor: [240, 243, 246],
        },
      },
    ],
    [
      {
        content: 'SISA SALDO AKHIR',
        colSpan: 5,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          textColor: [15, 45, 100],
          fillColor: [230, 242, 254],
        },
      },
      {
        content: formatRupiah(runningBalance),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          textColor: [15, 45, 100],
          fillColor: [230, 242, 254],
        },
      },
    ],
  ];

  // Eksekusi AutoTable dengan batas lebar pas A4 (182mm) agar tulisan tidak keluar
  autoTable(doc, {
    startY: 57,
    margin: { left: 14, right: 14 },
    tableWidth: 182,
    head: [['No', 'Tanggal', 'Keterangan', 'Pemasukan', 'Pengeluaran', 'Saldo']],
    body: tableRows,
    foot: tableFoot,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.2,
      overflow: 'linebreak',
      lineColor: [200, 205, 210],
      lineWidth: 0.15,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [16, 120, 75], // Nuansa Hijau Pramuka / Emerald
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    footStyles: {
      fillColor: [240, 243, 246],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 58, halign: 'left' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [250, 252, 253],
    },
  });

  // --- TANDA TANGAN (Ketua Pelaksana di KIRI, Bendahara di KANAN) ---
  let finalY = (doc as any).lastAutoTable?.finalY || 60;
  
  // Jika posisi tabel mendekati bagian bawah kertas (lebih dari 235mm), buat halaman baru
  if (finalY > 230) {
    doc.addPage();
    finalY = 25;
  }

  const signatureY = finalY + 12;

  // --- SEBELAH KIRI: KETUA PELAKSANA ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Mengetahui / Menyetujui,', 48, signatureY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Ketua Pelaksana', 48, signatureY + 5, { align: 'center' });

  // Ruang tanda tangan (~20mm)
  doc.setFont('helvetica', 'bold');
  doc.text('Sukriansyah, S.Pd', 48, signatureY + 26, { align: 'center' });
  
  // Garis bawah nama
  const ketuaNameWidth = doc.getTextWidth('Sukriansyah, S.Pd');
  doc.setLineWidth(0.3);
  doc.line(48 - ketuaNameWidth / 2, signatureY + 27, 48 + ketuaNameWidth / 2, signatureY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('NTA: -', 48, signatureY + 31.5, { align: 'center' });

  // --- SEBELAH KANAN: BENDAHARA ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Muara Kaman, ${printDateStr}`, 158, signatureY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Bendahara', 158, signatureY + 5, { align: 'center' });

  // Ruang tanda tangan (~20mm)
  doc.setFont('helvetica', 'bold');
  doc.text('Susilawati, S.Pd', 158, signatureY + 26, { align: 'center' });

  // Garis bawah nama
  const bendaharaNameWidth = doc.getTextWidth('Susilawati, S.Pd');
  doc.setLineWidth(0.3);
  doc.line(158 - bendaharaNameWidth / 2, signatureY + 27, 158 + bendaharaNameWidth / 2, signatureY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('NTA: -', 158, signatureY + 31.5, { align: 'center' });

  // Unduh dokumen PDF
  doc.save(fileName);
};
