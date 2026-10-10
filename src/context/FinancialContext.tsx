import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction, AppConfig, storage } from '../lib/storage';

interface FinancialContextType {
  transactions: Transaction[];
  config: AppConfig;
  loading: boolean;
  syncStatus: 'synced' | 'syncing' | 'error';
  lastSyncTime: Date | null;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  saveConfig: (config: AppConfig) => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | null>(null);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());
  const [config, setConfig] = useState<AppConfig>(() => storage.getConfig());
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    let unsubscribeTransactions: (() => void) | null = null;
    let unsubscribeConfig: (() => void) | null = null;

    const setupRealtimeSync = async () => {
      try {
        setSyncStatus('syncing');

        // 1. Cek apakah Firestore transactions masih kosong, jika kosong inisialisasi dari lokal
        const txCollectionRef = collection(db, 'transactions');
        const settingsDocRef = doc(db, 'settings', 'appConfig');

        try {
          const existingTxSnapshot = await getDocs(txCollectionRef);
          if (existingTxSnapshot.empty) {
            // Seed ke Firestore dari data lokal/default agar semua perangkat mendapatkan data yang sama
            const localData = storage.getTransactions();
            if (localData.length > 0) {
              const batch = writeBatch(db);
              localData.forEach((item) => {
                const itemRef = doc(db, 'transactions', item.id);
                batch.set(itemRef, item);
              });
              await batch.commit();
            }
          }

          // Cek config settings di Firestore
          const existingConfigSnapshot = await getDoc(settingsDocRef);
          if (!existingConfigSnapshot.exists()) {
            const localConfig = storage.getConfig();
            await setDoc(settingsDocRef, localConfig);
          }
        } catch (initErr) {
          console.warn('Initial cloud seed notice:', initErr);
        }

        // 2. Pasang Listener Real-time onSnapshot untuk Koleksi Transaksi
        unsubscribeTransactions = onSnapshot(
          txCollectionRef,
          (snapshot) => {
            const cloudTransactions: Transaction[] = [];
            snapshot.forEach((docSnapshot) => {
              const data = docSnapshot.data() as Transaction;
              cloudTransactions.push({
                ...data,
                id: docSnapshot.id,
              });
            });

            // Urutkan berdasarkan tanggal descending untuk tampilan tabel
            cloudTransactions.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setTransactions(cloudTransactions);
            storage.saveTransactions(cloudTransactions); // Simpan juga ke cache lokal
            setSyncStatus('synced');
            setLastSyncTime(new Date());
            setLoading(false);
          },
          (error) => {
            console.error('Error sinkronisasi transaksi:', error);
            setSyncStatus('error');
            handleFirestoreError(error, OperationType.GET, 'transactions');
          }
        );

        // 3. Pasang Listener Real-time onSnapshot untuk Konfigurasi Anggaran
        unsubscribeConfig = onSnapshot(
          settingsDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const cloudConfig = docSnapshot.data() as AppConfig;
              setConfig(cloudConfig);
              storage.saveConfig(cloudConfig);
            }
            setSyncStatus('synced');
            setLastSyncTime(new Date());
          },
          (error) => {
            console.error('Error sinkronisasi konfigurasi:', error);
            setSyncStatus('error');
            handleFirestoreError(error, OperationType.GET, 'settings/appConfig');
          }
        );
      } catch (err) {
        console.error('Gagal menghubungkan sinkronisasi real-time:', err);
        setSyncStatus('error');
        setLoading(false);
      }
    };

    setupRealtimeSync();

    return () => {
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeConfig) unsubscribeConfig();
    };
  }, []);

  // Fungsi Tambah Transaksi (Otomatis Tersinkron ke Cloud Firestore)
  const addTransaction = async (txData: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const newId = crypto.randomUUID();
    const newTransaction: Transaction = {
      ...txData,
      id: newId,
    };

    // Optimistic UI update
    setTransactions((prev) => [newTransaction, ...prev]);
    setSyncStatus('syncing');

    try {
      const docRef = doc(db, 'transactions', newId);
      await setDoc(docRef, newTransaction);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return newTransaction;
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, `transactions/${newId}`);
      throw error;
    }
  };

  // Fungsi Hapus Transaksi (Otomatis Terhapus di Cloud dan di Semua Perangkat)
  const deleteTransaction = async (id: string): Promise<void> => {
    // Optimistic UI update
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setSyncStatus('syncing');

    try {
      const docRef = doc(db, 'transactions', id);
      await deleteDoc(docRef);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
      throw error;
    }
  };

  // Fungsi Simpan Konfigurasi Anggaran (Otomatis Tersinkron ke Cloud)
  const saveConfig = async (newConfig: AppConfig): Promise<void> => {
    setConfig(newConfig);
    setSyncStatus('syncing');

    try {
      const docRef = doc(db, 'settings', 'appConfig');
      await setDoc(docRef, newConfig);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, 'settings/appConfig');
      throw error;
    }
  };

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        config,
        loading,
        syncStatus,
        lastSyncTime,
        addTransaction,
        deleteTransaction,
        saveConfig,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancialData = (): FinancialContextType => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancialData must be used within a FinancialProvider');
  }
  return context;
};
