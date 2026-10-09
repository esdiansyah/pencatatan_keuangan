export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface AppConfig {
  initialBudget: number;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'pramuka_transactions',
  CONFIG: 'pramuka_config',
  AUTH: 'pramuka_auth',
};

const DEFAULT_TRANSACTIONS: Transaction[] = [
  // September 2026
  {
    id: 'seed-sep-1',
    date: '2026-09-02',
    description: 'Penerimaan Dana Kas Panitia & Kas Kwarran',
    amount: 15000000,
    type: 'income',
  },
  {
    id: 'seed-sep-2',
    date: '2026-09-06',
    description: 'Pengadaan ATK, Kertas & Penggandaan Proposal Kegiatan',
    amount: 350000,
    type: 'expense',
  },
  {
    id: 'seed-sep-3',
    date: '2026-09-14',
    description: 'Uang Muka (DP) Pembuatan Kaos Panitia & Peserta Penggalang',
    amount: 2500000,
    type: 'expense',
  },
  {
    id: 'seed-sep-4',
    date: '2026-09-22',
    description: 'Biaya Koordinasi, Perizinan & Survei Bumi Perkemahan Muara Kaman',
    amount: 450000,
    type: 'expense',
  },
  {
    id: 'seed-sep-5',
    date: '2026-09-28',
    description: 'Penerimaan Iuran Registrasi Pangkalan SMP/MTs (Tahap I)',
    amount: 3600000,
    type: 'income',
  },
  // Oktober 2026
  {
    id: 'seed-oct-1',
    date: '2026-10-04',
    description: 'Pelunasan Pembuatan Kaos Panitia dan Pembina Pendamping',
    amount: 3200000,
    type: 'expense',
  },
  {
    id: 'seed-oct-2',
    date: '2026-10-10',
    description: 'Pembelian Tali Pramuka, Tongkat Semaphore, dan Patok Kemah',
    amount: 1150000,
    type: 'expense',
  },
  {
    id: 'seed-oct-3',
    date: '2026-10-18',
    description: 'Bantuan Dana Donatur / Sponsorship Kegiatan Pesta Penggalang',
    amount: 2500000,
    type: 'income',
  },
  {
    id: 'seed-oct-4',
    date: '2026-10-24',
    description: 'Sewa Tenda Utama Komando, Panggung Upacara & Sound System',
    amount: 2800000,
    type: 'expense',
  },
  {
    id: 'seed-oct-5',
    date: '2026-10-29',
    description: 'Pembelian Perlengkapan Obat P3K dan Posko Medis Perkemahan',
    amount: 600000,
    type: 'expense',
  },
  // November 2026
  {
    id: 'seed-nov-1',
    date: '2026-11-02',
    description: 'Pemasangan Instalasi Listrik & Penerangan Lapangan Perkemahan',
    amount: 850000,
    type: 'expense',
  },
  {
    id: 'seed-nov-2',
    date: '2026-11-04',
    description: 'Konsumsi Panitia, Juri Lomba & Tamu Undangan (Hari Ke-1)',
    amount: 2100000,
    type: 'expense',
  },
  {
    id: 'seed-nov-3',
    date: '2026-11-05',
    description: 'Konsumsi Panitia dan Juri Lomba (Hari Ke-2)',
    amount: 1950000,
    type: 'expense',
  },
  {
    id: 'seed-nov-4',
    date: '2026-11-06',
    description: 'Pengadaan Trophy Juara Umum, Medali & Piagam Penghargaan',
    amount: 2400000,
    type: 'expense',
  },
  {
    id: 'seed-nov-5',
    date: '2026-11-08',
    description: 'Biaya Kebersihan Lokasi Perkemahan & Operasional Transportasi Panitia',
    amount: 750000,
    type: 'expense',
  },
];

export const storage = {
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      // Seed default transactions
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(DEFAULT_TRANSACTIONS));
      return DEFAULT_TRANSACTIONS;
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },
  addTransaction: (transaction: Omit<Transaction, 'id'>) => {
    const transactions = storage.getTransactions();
    const newTransaction = { ...transaction, id: crypto.randomUUID() };
    transactions.push(newTransaction);
    // Sort chronologically descending for UI table
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    storage.saveTransactions(transactions);
    return newTransaction;
  },
  deleteTransaction: (id: string) => {
    const transactions = storage.getTransactions();
    storage.saveTransactions(transactions.filter((t) => t.id !== id));
  },
  getConfig: (): AppConfig => {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!data) {
      const defaultConfig: AppConfig = { initialBudget: 15000000 };
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
      return defaultConfig;
    }
    try {
      return JSON.parse(data);
    } catch {
      return { initialBudget: 15000000 };
    }
  },
  saveConfig: (config: AppConfig) => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },
  isLoggedIn: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
  },
  login: () => {
    localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },
};
