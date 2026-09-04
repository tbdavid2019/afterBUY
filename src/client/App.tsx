import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { TimelineView } from './views/TimelineView.tsx';
import { ShoppingView } from './views/ShoppingView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { ItemModal } from './components/ItemModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { StockSettingsModal } from './components/StockSettingsModal.tsx';
import { api } from './api.ts';
import { UserSession, ItemResponse, StockResponse } from '../shared/types.ts';
import { computeItemStatus } from '../shared/lifecycle.ts';
import { getInitialTheme, type ThemeMode } from './utils/theme.ts';

// Initial demo items for guest preview
const DEMO_ITEMS: ItemResponse[] = [
  {
    id: 'demo-1',
    userId: 'guest',
    name: 'Oral-B 電動牙刷刷頭',
    category: 'bathroom',
    trackingMode: 'cycle',
    cycleDays: 90,
    startDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paoMonths: null,
    expiryDate: null,
    warrantyDate: null,
    backupStock: 2,
    minStockAlert: 1,
    price: 320,
    specModel: 'EB50',
    location: '主衛浴',
    isStored: false,
    snoozeUntil: null,
    notes: 'EB50 多動向交叉刷頭',
    imageUrl: '/images/items/toothbrush-head.png',
    calendarSequence: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...computeItemStatus({
      startDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      trackingMode: 'cycle',
      cycleDays: 90,
      backupStock: 2,
    }),
  },
  {
    id: 'demo-2',
    userId: 'guest',
    name: 'Brita 淨水器 MAXTRA+ 濾芯',
    category: 'kitchen',
    trackingMode: 'cycle',
    cycleDays: 30,
    startDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paoMonths: null,
    expiryDate: null,
    warrantyDate: null,
    backupStock: 0,
    minStockAlert: 1,
    price: 250,
    specModel: 'MAXTRA+ 全效型',
    location: '廚房流理台',
    isStored: false,
    snoozeUntil: null,
    notes: '建議水質硬度高時每月更換',
    imageUrl: '/images/items/water-filter.png',
    calendarSequence: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...computeItemStatus({
      startDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      trackingMode: 'cycle',
      cycleDays: 30,
      backupStock: 0,
    }),
  },
  {
    id: 'demo-3',
    userId: 'guest',
    name: '安耐曬防曬乳 (開封後保存)',
    category: 'skincare',
    trackingMode: 'pao',
    cycleDays: null,
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paoMonths: 12,
    expiryDate: null,
    warrantyDate: null,
    backupStock: 1,
    minStockAlert: 1,
    price: 850,
    specModel: '60ml 金鑽高效',
    location: '臥室梳妝台',
    isStored: false,
    snoozeUntil: null,
    notes: '金鑽高效防曬露 60ml',
    imageUrl: '/images/items/sunscreen.png',
    calendarSequence: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...computeItemStatus({
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      trackingMode: 'pao',
      paoMonths: 12,
      backupStock: 1,
    }),
  },
  {
    id: 'demo-4',
    userId: 'guest',
    name: '日立除濕機 原廠保固',
    category: 'appliances',
    trackingMode: 'warranty',
    cycleDays: null,
    startDate: '2024-01-15',
    paoMonths: null,
    expiryDate: null,
    warrantyDate: '2027-01-15',
    backupStock: 0,
    minStockAlert: 0,
    price: 12900,
    specModel: 'RD-200HG',
    location: '客廳',
    isStored: false,
    snoozeUntil: null,
    notes: '登錄享全機 3 年保固',
    imageUrl: '/images/items/dehumidifier.png',
    calendarSequence: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...computeItemStatus({
      startDate: '2024-01-15',
      trackingMode: 'warranty',
      warrantyDate: '2027-01-15',
      backupStock: 0,
    }),
  },
];

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('afterbuy_user');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [devices, setDevices] = useState<any[]>([]);
  const [items, setItems] = useState<ItemResponse[]>(DEMO_ITEMS);
  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [currentStockId, setCurrentStockId] = useState<string>('all');
  const [settingsStockId, setSettingsStockId] = useState<string | null>(null);
  const [isStockSettingsOpen, setIsStockSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemResponse | null>(null);
  const [historyItem, setHistoryItem] = useState<ItemResponse | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    getInitialTheme(typeof window === 'undefined' ? null : window.localStorage.getItem('afterbuy-theme'))
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('afterbuy-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f2f0ea' : '#081f33');
  }, [theme]);

  // Load User, Stocks & Items
  const loadUserAndItems = async (stockIdToLoad?: string) => {
    try {
      const meRes = await api.getMe();
      if (meRes.user) {
        setUser(meRes.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('afterbuy_user', JSON.stringify(meRes.user));
        }
        setDevices(meRes.devices || []);

        // Load stocks
        const stocksRes = await api.getStocks();
        setStocks(stocksRes.stocks);

        // Load items for specified stock or currentStockId
        const effectiveStockId = stockIdToLoad !== undefined ? stockIdToLoad : currentStockId;
        const itemsRes = await api.getItems(effectiveStockId);
        setItems(itemsRes.items);

        // Check for joinStock URL query param (e.g. ?joinStock=CODE)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const joinCode = urlParams.get('joinStock');
          if (joinCode) {
            urlParams.delete('joinStock');
            const newSearch = urlParams.toString();
            window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`);
            try {
              const joinRes = await api.joinStock(joinCode);
              alert(`已成功加入備品庫「${joinRes.stock.name}」！`);
              const refreshedStocks = await api.getStocks();
              setStocks(refreshedStocks.stocks);
              setCurrentStockId(joinRes.stock.id);
              const refreshedItems = await api.getItems(joinRes.stock.id);
              setItems(refreshedItems.items);
            } catch (joinErr: any) {
              alert(joinErr.message || '加入備品庫失敗');
            }
          }
        }
      } else {
        // Session truly invalidated on server
        const cached = localStorage.getItem('afterbuy_user');
        if (cached) {
          localStorage.removeItem('afterbuy_user');
          setUser(null);
          setStocks([]);
          setCurrentStockId('all');
          setItems(DEMO_ITEMS);
        }
      }
    } catch (err) {
      console.error('Failed to load user or items:', err);
    }
  };

  useEffect(() => {
    loadUserAndItems();
  }, []);

  const handleSelectStock = async (stockId: string) => {
    setCurrentStockId(stockId);
    if (user) {
      try {
        const itemsRes = await api.getItems(stockId);
        setItems(itemsRes.items);
      } catch (err) {
        console.error('Failed to switch stock:', err);
      }
    }
  };

  const handleOpenStockSettings = (stockId: string) => {
    setSettingsStockId(stockId);
    setIsStockSettingsOpen(true);
  };

  const handleOpenNewItem = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: ItemResponse) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleReplace = async (id: string) => {
    if (!user) {
      // Local demo mode replace
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const todayStr = new Date().toISOString().split('T')[0];
          const newStock = Math.max(0, i.backupStock - 1);
          return {
            ...i,
            startDate: todayStr,
            backupStock: newStock,
            ...computeItemStatus({
              ...i,
              startDate: todayStr,
              backupStock: newStock,
            }),
          };
        })
      );
      return;
    }

    try {
      await api.markReplaced(id);
      await loadUserAndItems();
    } catch (err: any) {
      alert(err.message || '更新失敗');
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    if (!user) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const newStock = Math.max(0, i.backupStock + delta);
          return {
            ...i,
            backupStock: newStock,
            needsRestock: newStock < i.minStockAlert,
          };
        })
      );
      return;
    }

    try {
      await api.adjustStock(id, delta);
      await loadUserAndItems();
    } catch (err: any) {
      alert(err.message || '庫存調整失敗');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('確定要刪除此物品？')) return;
    if (!user) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }

    try {
      await api.deleteItem(id);
      await loadUserAndItems();
    } catch (err: any) {
      alert(err.message || '刪除失敗');
    }
  };

  const handleBatchReplace = async (ids: string[]) => {
    if (!user) {
      const todayStr = new Date().toISOString().split('T')[0];
      setItems((prev) =>
        prev.map((i) => {
          if (!ids.includes(i.id)) return i;
          const newStock = Math.max(0, i.backupStock - 1);
          return {
            ...i,
            startDate: todayStr,
            backupStock: newStock,
            ...computeItemStatus({
              ...i,
              startDate: todayStr,
              backupStock: newStock,
            }),
          };
        })
      );
      return;
    }
    await api.batchReplace(ids);
    await loadUserAndItems();
  };

  const handleBatchStock = async (ids: string[], delta: number) => {
    if (!user) {
      setItems((prev) =>
        prev.map((i) => {
          if (!ids.includes(i.id)) return i;
          const newStock = Math.max(0, i.backupStock + delta);
          return {
            ...i,
            backupStock: newStock,
            needsRestock: newStock < i.minStockAlert,
          };
        })
      );
      return;
    }
    await api.batchStock(ids, delta);
    await loadUserAndItems();
  };

  const handleBatchDelete = async (ids: string[]) => {
    if (!user) {
      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      return;
    }
    await api.batchDelete(ids);
    await loadUserAndItems();
  };

  const handleStartUsing = async (id: string) => {
    if (!user) {
      const todayStr = new Date().toISOString().split('T')[0];
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const updated = {
            ...i,
            startDate: todayStr,
            isStored: false,
            snoozeUntil: null,
          };
          return {
            ...updated,
            ...computeItemStatus(updated),
          };
        })
      );
      return;
    }

    try {
      await api.startUsingItem(id);
      await loadUserAndItems();
    } catch (err: any) {
      alert(err.message || '啟用失敗');
    }
  };

  const handleSnooze = async (id: string, days: number) => {
    if (!user) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const snoozeUntil = targetDate.toISOString().split('T')[0];
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const updated = {
            ...i,
            snoozeUntil,
          };
          return {
            ...updated,
            ...computeItemStatus(updated),
          };
        })
      );
      return;
    }

    try {
      await api.snoozeItem(id, days);
      await loadUserAndItems();
    } catch (err: any) {
      alert(err.message || '延後失敗');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('afterbuy_user');
    }
    setUser(null);
    setDevices([]);
    setItems(DEMO_ITEMS);
    setCurrentTab('dashboard');
  };

  // Counts for badge
  const overdueCount = items.filter((i) => i.healthStatus === 'overdue' || i.healthStatus === 'due_soon').length;
  const restockCount = items.filter((i) => i.needsRestock).length;

  return (
    <div className="app-shell min-h-dvh flex flex-col font-sans">
      {/* Top Header */}
      <Header
        user={user}
        stocks={stocks}
        currentStockId={currentStockId}
        onSelectStock={handleSelectStock}
        onOpenStockSettings={handleOpenStockSettings}
        onRefreshStocks={loadUserAndItems}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNewItem={handleOpenNewItem}
        theme={theme}
        onToggleTheme={() => setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-3 md:pt-5">
        {currentTab === 'dashboard' && (
          <DashboardView
            items={items}
            onReplace={handleReplace}
            onAdjustStock={handleAdjustStock}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onViewHistory={(item) => setHistoryItem(item)}
            onOpenNewItem={handleOpenNewItem}
            onStartUsing={handleStartUsing}
            onSnooze={handleSnooze}
            onBatchReplace={handleBatchReplace}
            onBatchStock={handleBatchStock}
            onBatchDelete={handleBatchDelete}
            onRefreshItems={loadUserAndItems}
            user={user}
            onAddGuestItems={(newItems) => setItems((prev) => [...newItems, ...prev])}
          />
        )}

        {currentTab === 'timeline' && (
          <TimelineView
            items={items}
            onReplace={handleReplace}
            onEdit={handleEditItem}
          />
        )}

        {currentTab === 'shopping' && (
          <ShoppingView
            items={items}
            onAdjustStock={handleAdjustStock}
            onBatchStock={handleBatchStock}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            devices={devices}
            onOpenAuth={() => setIsAuthOpen(true)}
            onLogout={handleLogout}
            onRefreshUser={loadUserAndItems}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        overdueCount={overdueCount}
        restockCount={restockCount}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          loadUserAndItems();
        }}
      />

      <ItemModal
        isOpen={isItemModalOpen}
        itemToEdit={itemToEdit}
        user={user}
        stocks={stocks}
        currentStockId={currentStockId}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        onSave={() => loadUserAndItems()}
        onAddGuestItem={(newItem) => setItems((prev) => [newItem, ...prev])}
        onUpdateGuestItem={(updatedItem) =>
          setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)))
        }
      />

      <StockSettingsModal
        isOpen={isStockSettingsOpen}
        stockId={settingsStockId}
        user={user}
        onClose={() => setIsStockSettingsOpen(false)}
        onStockUpdated={() => loadUserAndItems()}
        onStockDeleted={() => {
          setCurrentStockId('all');
          loadUserAndItems('all');
        }}
      />

      <HistoryModal
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />
    </div>
  );
};
