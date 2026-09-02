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
import { api } from './api.ts';
import { UserSession, ItemResponse } from '../shared/types.ts';
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
    notes: 'EB50 多動向交叉刷頭',
    imageUrl: null,
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
    notes: '建議水質硬度高時每月更換',
    imageUrl: null,
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
    notes: '金鑽高效防曬露 60ml',
    imageUrl: null,
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
    notes: '登錄享全機 3 年保固',
    imageUrl: null,
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
  const [user, setUser] = useState<UserSession | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [items, setItems] = useState<ItemResponse[]>(DEMO_ITEMS);
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

  // Load User & Items
  const loadUserAndItems = async () => {
    try {
      const meRes = await api.getMe();
      if (meRes.user) {
        setUser(meRes.user);
        setDevices(meRes.devices || []);
        const itemsRes = await api.getItems();
        setItems(itemsRes.items);
      }
    } catch (err) {
      console.error('Failed to load user or items:', err);
    }
  };

  useEffect(() => {
    loadUserAndItems();
  }, []);

  const handleOpenNewItem = () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
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

  const handleLogout = async () => {
    await api.logout();
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
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        onSave={() => loadUserAndItems()}
      />

      <HistoryModal
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />
    </div>
  );
};
