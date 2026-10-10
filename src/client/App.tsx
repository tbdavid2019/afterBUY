import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Check, X } from 'lucide-react';
import { Header } from './components/Header.tsx';
import { Navbar, NavTab } from './components/Navbar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { TimelineView } from './views/TimelineView.tsx';
import { ShoppingView } from './views/ShoppingView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { ItemModal } from './components/ItemModal.tsx';
import { PwaUpdateNotice } from './components/PwaUpdateNotice.tsx';
import { GuestStatusBanner } from './components/GuestStatusBanner.tsx';
import { useTranslation } from './i18n/index.tsx';
import { useSwipeGesture } from './hooks/useSwipeGesture.ts';
import { HistoryModal } from './components/HistoryModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { StockSettingsModal } from './components/StockSettingsModal.tsx';
import { PresetCatalogModal } from './components/PresetCatalogModal.tsx';
import { VersionNoticeModal, CURRENT_APP_RELEASE_DATE } from './components/VersionNoticeModal.tsx';
import { ItemPreset } from './utils/category.ts';
import { api } from './api.ts';
import { UserSession, ItemResponse, StockResponse, ActiveUnitInstance } from '../shared/types.ts';
import { computeItemStatus } from '../shared/lifecycle.ts';
import { addBusinessDays, businessDate } from '../shared/date.ts';
import { getInitialTheme, getInitialPalette, type ThemeMode, type ThemePalette, THEME_PALETTES } from './utils/theme.ts';
import { DEMO_ITEM_IDS, mergeGuestItems, readGuestItems, writeGuestItems, setDemoCleared, restoreGuestDemoItems, deleteGuestDemoItem, deleteGuestDemoItems } from './utils/guestStorage.ts';

// Initial demo items for guest preview
const DEMO_ITEMS: ItemResponse[] = [
  {
    id: 'demo-1',
    userId: 'guest',
    name: 'Oral-B 電動牙刷刷頭',
    category: 'bathroom',
    trackingMode: 'cycle',
    cycleDays: 90,
    startDate: businessDate(new Date(Date.now() - 85 * 24 * 60 * 60 * 1000)),
    paoMonths: null,
    expiryDate: null,
    warrantyDate: null,
    activeUnits: 1,
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
      startDate: businessDate(new Date(Date.now() - 85 * 24 * 60 * 60 * 1000)),
      trackingMode: 'cycle',
      cycleDays: 90,
      activeUnits: 1,
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
    startDate: businessDate(new Date(Date.now() - 32 * 24 * 60 * 60 * 1000)),
    paoMonths: null,
    expiryDate: null,
    warrantyDate: null,
    activeUnits: 1,
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
      startDate: businessDate(new Date(Date.now() - 32 * 24 * 60 * 60 * 1000)),
      trackingMode: 'cycle',
      cycleDays: 30,
      activeUnits: 1,
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
    startDate: businessDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
    paoMonths: 12,
    expiryDate: null,
    warrantyDate: null,
    activeUnits: 1,
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
      startDate: businessDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
      trackingMode: 'pao',
      paoMonths: 12,
      activeUnits: 1,
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
    activeUnits: 1,
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
      activeUnits: 1,
      backupStock: 0,
    }),
  },
  {
    id: 'demo-5',
    userId: 'guest',
    name: '好市多 Kirkland 深海魚油膠囊 (150顆)',
    category: 'medicine',
    trackingMode: 'quantity',
    cycleDays: null,
    startDate: businessDate(new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)),
    paoMonths: null,
    expiryDate: null,
    warrantyDate: null,
    initialQuantity: 150,
    currentQuantity: 128,
    dailyUsage: 2,
    quantityUnit: '顆',
    activeUnits: 1,
    backupStock: 1,
    minStockAlert: 1,
    price: 699,
    specModel: '好市多 150粒裝 / 每日2粒',
    location: '餐桌保健品架',
    isStored: false,
    snoozeUntil: null,
    notes: '好市多常備 Kirkland 150 粒魚油，飯後食用 2 顆',
    imageUrl: '',
    calendarSequence: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...computeItemStatus({
      startDate: businessDate(new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)),
      trackingMode: 'quantity',
      initialQuantity: 150,
      currentQuantity: 128,
      dailyUsage: 2,
      quantityUnit: '顆',
      backupStock: 1,
    }),
  },
];

export const App: React.FC = () => {
  const { locale } = useTranslation();
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
  const [items, setItems] = useState<ItemResponse[]>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('afterbuy_user')) return [];
    return mergeGuestItems(DEMO_ITEMS);
  });
  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [currentStockId, setCurrentStockId] = useState<string>('all');
  const currentStockIdRef = useRef(currentStockId);
  currentStockIdRef.current = currentStockId;
  const currentUserRef = useRef<UserSession | null>(user);
  currentUserRef.current = user;
  const [settingsStockId, setSettingsStockId] = useState<string | null>(null);
  const [isStockSettingsOpen, setIsStockSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemModalInitialTab, setItemModalInitialTab] = useState<'presets' | 'form'>('presets');
  const [itemToEdit, setItemToEdit] = useState<ItemResponse | null>(null);
  const [isPresetCatalogOpen, setIsPresetCatalogOpen] = useState(false);
  const [presetForNewItem, setPresetForNewItem] = useState<ItemPreset | null>(null);
  const [isVersionNoticeOpen, setIsVersionNoticeOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<ItemResponse | null>(null);
  const isEditing = isItemModalOpen || isStockSettingsOpen || isAuthOpen || isPresetCatalogOpen || Boolean(historyItem);
  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;
  const [versionNoticePending, setVersionNoticePending] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    getInitialTheme(typeof window === 'undefined' ? null : window.localStorage.getItem('afterbuy-theme'))
  );
  const [palette, setPalette] = useState<ThemePalette>(() =>
    getInitialPalette(typeof window === 'undefined' ? null : window.localStorage.getItem('afterbuy-theme-palette'))
  );
  const [isLoading, setIsLoading] = useState(() => typeof window !== 'undefined' && Boolean(localStorage.getItem('afterbuy_user')));
  const [loadError, setLoadError] = useState<string | null>(null);
  const stockRequestId = useRef(0);
  const [guestStorageError, setGuestStorageError] = useState<string | null>(null);
  const [pendingGuestCount, setPendingGuestCount] = useState(() => readGuestItems().length);
  const [importingGuest, setImportingGuest] = useState(false);
  const [guestImportMessage, setGuestImportMessage] = useState<string | null>(null);
  const guestImportLock = useRef(false);
  const importedGuestIds = useRef(new Set<string>());
  const pageSwipe = useSwipeGesture({
    disabled: isEditing || isVersionNoticeOpen || importingGuest,
    onSwipe(direction) {
      if (document.querySelector('[role="dialog"]')) return;
      const pages: NavTab[] = ['dashboard', 'timeline', 'shopping', 'settings'];
      const index = pages.indexOf(currentTab) + (direction === 'left' ? 1 : -1);
      if (index >= 0 && index < pages.length) {
        setCurrentTab(pages[index]);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    },
  });

  // Undo Toast state for reversible 「今天已換」
  const [undoToast, setUndoToast] = useState<{
    itemId: string;
    itemName: string;
    snapshot: ItemResponse;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setGuestItems = (next: ItemResponse[] | ((previous: ItemResponse[]) => ItemResponse[])) => {
    setItems((previous) => {
      const resolved = typeof next === 'function' ? next(previous) : next;
      try {
        writeGuestItems(resolved);
        window.setTimeout(() => setGuestStorageError(null), 0);
      } catch (error: any) {
        // Keep the in-memory edit usable, but make a quota failure explicit.
        window.setTimeout(() => setGuestStorageError(error.message), 0);
      }
      return resolved;
    });
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePalette = palette;
    window.localStorage.setItem('afterbuy-theme', theme);
    window.localStorage.setItem('afterbuy-theme-palette', palette);
    const activePaletteConfig = THEME_PALETTES.find((p) => p.id === palette);
    const themeColor = theme === 'dark' ? '#111417' : (activePaletteConfig?.lightBg || '#f7f5f0');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  }, [theme, palette]);



  const importGuestItems = async (availableStocks: StockResponse[]): Promise<void> => {
    const accountId = currentUserRef.current?.id;
    if (!accountId || guestImportLock.current) return;
    const editableStock = availableStocks.find((stock) => stock.id === currentStockId && stock.myRole !== 'viewer')
      || availableStocks.find((stock) => stock.myRole !== 'viewer');
    if (!editableStock) return;
    guestImportLock.current = true;
    setImportingGuest(true);
    setGuestImportMessage(null);
    const localItems = readGuestItems();
    let importedCount = 0;
    let failures = 0;
    try {
      for (const item of localItems) {
        if (currentUserRef.current?.id !== accountId) return;
        if (importedGuestIds.current.has(`${accountId}:${item.id}`)) continue;
        try {
          let imageUrl = item.imageUrl || undefined;
          if (imageUrl?.startsWith('data:')) {
            const match = imageUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s);
            if (!match) throw new Error('照片格式無法辨識');
            const mime = match[1] || 'image/jpeg';
            const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
            const extension = mime.split('/')[1] || 'jpg';
            const upload = await api.uploadImage(new File([bytes], `guest-${item.id}.${extension}`, { type: mime }));
            imageUrl = upload.url;
          }
          if (currentUserRef.current?.id !== accountId) return;
          await api.createItem({
            guestSourceId: item.id,
            stockId: editableStock.id,
            name: item.name,
            category: item.category,
            trackingMode: item.trackingMode,
            cycleDays: item.cycleDays ?? undefined,
            startDate: item.startDate,
            paoMonths: item.paoMonths ?? undefined,
            expiryDate: item.expiryDate ?? undefined,
            warrantyDate: item.warrantyDate ?? undefined,
            initialQuantity: item.initialQuantity,
            currentQuantity: item.currentQuantity,
            dailyUsage: item.dailyUsage,
            quantityUnit: item.quantityUnit,
            activeUnits: item.activeUnits ?? 1,
            backupStock: item.backupStock,
            minStockAlert: item.minStockAlert,
            price: item.price,
            specModel: item.specModel,
            location: item.location,
            isStored: item.isStored,
            snoozeUntil: item.snoozeUntil,
            notes: item.notes || undefined,
            imageUrl,
          });
          importedGuestIds.current.add(`${accountId}:${item.id}`);
          importedCount++;
        } catch (error) {
          failures++;
          console.error(`Failed to import guest item ${item.id}`, error);
        }
      }
      if (currentUserRef.current?.id !== accountId) return;
      // Retain failed items and demo edits. A retry in this session skips items
      // already created, even if local cleanup could not be written.
      const remaining = readGuestItems().filter((item) => !importedGuestIds.current.has(`${accountId}:${item.id}`));
      try {
        writeGuestItems(remaining, { preserveDemos: true });
        setPendingGuestCount(remaining.length);
        setGuestImportMessage(locale === 'zh-TW'
          ? (failures ? `已帶入 ${importedCount} 項；${remaining.length} 項未成功，仍保留在本機，可再次帶入。` : '試用物品已帶入帳號，目前的數量與備品狀態已保留。')
          : (failures ? `${importedCount} imported. ${remaining.length} remain locally; retry to import them.` : 'Trial items imported to your account, preserving quantities and spare stock.'));
      } catch (error: any) {
        setGuestImportMessage(locale === 'zh-TW' ? `雲端已帶入 ${importedCount} 項，但本機清理失敗：${error.message}。請在此頁重試。` : 'Cloud import completed, but local cleanup failed. Retry on this page.');
      }
      await loadUserAndItems();
    } finally {
      guestImportLock.current = false;
      setImportingGuest(false);
    }
  };

  // Load User, Stocks & Items
  const loadUserAndItems = async (stockIdToLoad?: string) => {
    const requestId = ++stockRequestId.current;
    setIsLoading(true);
    setLoadError(null);
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
        if (requestId !== stockRequestId.current) return;
        setStocks(stocksRes.stocks);

        setPendingGuestCount(readGuestItems().length);

        // Load items for specified stock or currentStockId
        const effectiveStockId = stockIdToLoad !== undefined ? stockIdToLoad : currentStockId;
        const itemsRes = await api.getItems(effectiveStockId);
        if (requestId !== stockRequestId.current) return;
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
          setItems(mergeGuestItems(DEMO_ITEMS));
        }
      }
    } catch (err) {
      console.error('Failed to load user or items:', err);
      if (requestId === stockRequestId.current) setLoadError(err instanceof Error ? err.message : '資料載入失敗，請稍後重試');
    } finally {
      if (requestId === stockRequestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserAndItems();
    if (typeof window !== 'undefined') {
      const lastSeen = localStorage.getItem('afterbuy_last_seen_date');
      if (lastSeen !== CURRENT_APP_RELEASE_DATE) {
        const timer = setTimeout(() => {
          setVersionNoticePending(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    if (versionNoticePending && !isEditingRef.current) {
      setIsVersionNoticeOpen(true);
      setVersionNoticePending(false);
    }
  }, [versionNoticePending, isEditing]);

  const handleSelectStock = async (stockId: string) => {
    setCurrentStockId(stockId);
    if (user) {
      const requestId = ++stockRequestId.current;
      try {
        const itemsRes = await api.getItems(stockId);
        if (requestId !== stockRequestId.current) return;
        setItems(itemsRes.items);
      } catch (err) {
        if (requestId !== stockRequestId.current) return;
        console.error('Failed to switch stock:', err);
        setLoadError(err instanceof Error ? err.message : '備品庫切換失敗');
      }
    }
  };

  const handleOpenStockSettings = (stockId: string) => {
    setSettingsStockId(stockId);
    setIsStockSettingsOpen(true);
  };

  const handleOpenNewItem = () => {
    setItemToEdit(null);
    setPresetForNewItem(null);
    setItemModalInitialTab('presets');
    setIsItemModalOpen(true);
  };

  const handleOpenPresetCatalog = () => {
    setItemToEdit(null);
    setPresetForNewItem(null);
    setItemModalInitialTab('presets');
    setIsItemModalOpen(true);
  };

  const handleSelectPresetForModal = (preset: ItemPreset) => {
    setItemToEdit(null);
    setPresetForNewItem(preset);
    setItemModalInitialTab('form');
    setIsPresetCatalogOpen(false);
    setIsItemModalOpen(true);
  };

  const handleDirectAddPreset = async (preset: ItemPreset) => {
    const todayStr = businessDate();
    const effectiveStockId = currentStockId !== 'all' ? currentStockId : (stocks[0]?.id || undefined);
    let initialUnitsData: ActiveUnitInstance[] | null = null;
    if (preset.defaultActiveUnits && preset.defaultActiveUnits > 1) {
      const labels = preset.defaultActiveUnitLabels || ['位置 1', '位置 2', '位置 3', '位置 4'];
      initialUnitsData = Array.from({ length: preset.defaultActiveUnits }, (_, i) => ({
        id: `u-${i + 1}`,
        label: labels[i] || `位置 ${i + 1}`,
        startDate: todayStr,
      }));
    }

    if (user) {
      await api.createItem({
        stockId: effectiveStockId,
        name: preset.name,
        category: preset.category,
        trackingMode: preset.trackingMode,
        cycleDays: preset.trackingMode === 'cycle' ? preset.cycleDays : undefined,
        startDate: todayStr,
        paoMonths: preset.trackingMode === 'pao' ? preset.paoMonths : undefined,
        initialQuantity: preset.trackingMode === 'quantity' ? (preset.initialQuantity ?? 60) : undefined,
        currentQuantity: preset.trackingMode === 'quantity' ? (preset.initialQuantity ?? 60) : undefined,
        dailyUsage: preset.trackingMode === 'quantity' ? (preset.dailyUsage ?? 1) : undefined,
        quantityUnit: preset.trackingMode === 'quantity' ? (preset.quantityUnit ?? '顆') : undefined,
        activeUnits: preset.defaultActiveUnits ?? 1,
        activeUnitsData: initialUnitsData ? JSON.stringify(initialUnitsData) : undefined,
        backupStock: preset.minStockAlert ?? 1,
        minStockAlert: preset.minStockAlert ?? 1,
        price: preset.defaultPrice ?? null,
        specModel: preset.defaultSpecModel ?? null,
        notes: preset.notes ?? undefined,
        imageUrl: preset.imageUrl ?? undefined,
        isStored: false,
      });
      await loadUserAndItems(currentStockId);
    } else {
      const newItem: ItemResponse = {
        id: `guest-${crypto.randomUUID()}`,
        userId: 'guest',
        name: preset.name,
        category: preset.category,
        trackingMode: preset.trackingMode,
        cycleDays: preset.trackingMode === 'cycle' ? preset.cycleDays ?? 90 : null,
        startDate: todayStr,
        paoMonths: preset.trackingMode === 'pao' ? preset.paoMonths ?? 6 : null,
        expiryDate: null,
        warrantyDate: null,
        initialQuantity: preset.trackingMode === 'quantity' ? (preset.initialQuantity ?? 60) : null,
        currentQuantity: preset.trackingMode === 'quantity' ? (preset.initialQuantity ?? 60) : null,
        dailyUsage: preset.trackingMode === 'quantity' ? (preset.dailyUsage ?? 1) : null,
        quantityUnit: preset.trackingMode === 'quantity' ? (preset.quantityUnit ?? '顆') : null,
        activeUnits: preset.defaultActiveUnits ?? 1,
        activeUnitsData: initialUnitsData,
        backupStock: preset.minStockAlert ?? 1,
        minStockAlert: preset.minStockAlert ?? 1,
        price: preset.defaultPrice ?? null,
        specModel: preset.defaultSpecModel ?? null,
        location: null,
        isStored: false,
        snoozeUntil: null,
        notes: preset.notes ?? null,
        imageUrl: preset.imageUrl ?? null,
        calendarSequence: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...computeItemStatus({
          startDate: todayStr,
          trackingMode: preset.trackingMode,
          cycleDays: preset.trackingMode === 'cycle' ? preset.cycleDays ?? 90 : null,
          paoMonths: preset.trackingMode === 'pao' ? preset.paoMonths ?? 6 : null,
          initialQuantity: preset.trackingMode === 'quantity' ? (preset.initialQuantity ?? 60) : null,
          currentQuantity: preset.trackingMode === 'quantity' ? (preset.initialQuantity ?? 60) : null,
          dailyUsage: preset.trackingMode === 'quantity' ? (preset.dailyUsage ?? 1) : null,
          quantityUnit: preset.trackingMode === 'quantity' ? (preset.quantityUnit ?? '顆') : null,
          activeUnits: preset.defaultActiveUnits ?? 1,
          activeUnitsData: initialUnitsData,
          backupStock: preset.minStockAlert ?? 1,
          minStockAlert: preset.minStockAlert ?? 1,
          isStored: false,
        }),
      };
      setGuestItems((prev) => [newItem, ...prev]);
    }
  };

  const handleEditItem = (item: ItemResponse) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleReplace = async (id: string, unitId?: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    if (target.isStored || (target.trackingMode !== 'cycle' && target.trackingMode !== 'pao' && target.trackingMode !== 'quantity')) return;

    // Snapshot before mutation for reversible undo
    const snapshot: ItemResponse = { ...target };
    const todayStr = businessDate();
    const newStock = Math.max(0, target.backupStock - 1);

    let existingUnits: ActiveUnitInstance[] = [];
    if (target.activeUnitsData) {
      try {
        existingUnits = typeof target.activeUnitsData === 'string' ? JSON.parse(target.activeUnitsData) : [...target.activeUnitsData];
      } catch {
        existingUnits = [];
      }
    }

    const isMultiUnit = existingUnits.length > 1;
    const newCurrentQty = target.trackingMode === 'quantity'
      ? (isMultiUnit ? target.currentQuantity : (target.initialQuantity || 60))
      : target.currentQuantity;

    let updatedUnits: ActiveUnitInstance[] | null = null;
    let newStartDate = todayStr;

    if (existingUnits.length > 0) {
        let targetIndex = -1;
        if (unitId) {
          targetIndex = existingUnits.findIndex((u) => u.id === unitId);
        }
        if (targetIndex === -1) {
          const sorted = existingUnits.map((u, i) => ({ u, i })).sort((a, b) => (a.u.startDate || '').localeCompare(b.u.startDate || ''));
          targetIndex = sorted[0]?.i ?? -1;
        }

        if (targetIndex !== -1) {
          existingUnits[targetIndex] = {
            ...existingUnits[targetIndex],
            startDate: todayStr,
          };
          updatedUnits = existingUnits;
          const sortedDates = existingUnits.map((u) => u.startDate).sort();
          newStartDate = sortedDates[0] || todayStr;
        }
      }

    const nowIso = new Date().toISOString();
    const updatedTarget: ItemResponse = {
      ...target,
      startDate: newStartDate,
      backupStock: newStock,
      currentQuantity: newCurrentQty,
      quantityUpdatedAt: nowIso,
      updatedAt: nowIso,
      activeUnitsData: updatedUnits ?? target.activeUnitsData,
      snoozeUntil: null,
      ...computeItemStatus({
        ...target,
        startDate: newStartDate,
        backupStock: newStock,
        currentQuantity: newCurrentQty,
        quantityUpdatedAt: nowIso,
        updatedAt: nowIso,
        activeUnitsData: updatedUnits ?? target.activeUnitsData,
        snoozeUntil: null,
      }),
    };

    if (!user) {
      setGuestItems((prev) => prev.map((i) => (i.id === id ? updatedTarget : i)));
    } else {
      // Optimistic update for instant mobile feedback
      setItems((prev) => prev.map((i) => (i.id === id ? updatedTarget : i)));
      try {
        await api.markReplaced(id, unitId);
      } catch (err: any) {
        alert(err.message || '更新失敗');
        setItems((prev) => prev.map((i) => (i.id === id ? snapshot : i)));
        return;
      }
    }

    // Trigger 5-second tactile undo toast
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setUndoToast({
      itemId: id,
      itemName: target.name,
      snapshot,
    });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
  };

  const handleConsume = async (id: string, amount: number) => {
    const target = items.find((i) => i.id === id);
    if (!target || target.isStored || target.trackingMode !== 'quantity') return;

    const currentVal = target.remainingQuantity !== null && target.remainingQuantity !== undefined
      ? target.remainingQuantity
      : (target.currentQuantity !== null && target.currentQuantity !== undefined
          ? target.currentQuantity
          : (target.initialQuantity || 60));

    const newCurrentQty = Math.max(0, Math.round((currentVal - amount) * 10) / 10);
    const nowIso = new Date().toISOString();
    const updatedTarget: ItemResponse = {
      ...target,
      currentQuantity: newCurrentQty,
      quantityUpdatedAt: nowIso,
      updatedAt: nowIso,
      ...computeItemStatus({
        ...target,
        currentQuantity: newCurrentQty,
        quantityUpdatedAt: nowIso,
        updatedAt: nowIso,
      }),
    };

    if (!user) {
      setGuestItems((prev) => prev.map((i) => (i.id === id ? updatedTarget : i)));
    } else {
      setItems((prev) => prev.map((i) => (i.id === id ? updatedTarget : i)));
      try {
        await api.consumeItem(id, amount);
      } catch (err: any) {
        alert(err.message || '扣減失敗');
        setItems((prev) => prev.map((i) => (i.id === id ? target : i)));
      }
    }
  };

  const handleUndoReplace = async () => {
    if (!undoToast) return;
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    const { itemId, snapshot } = undoToast;
    setUndoToast(null);

    if (!user) {
      setGuestItems((prev) => prev.map((i) => (i.id === itemId ? snapshot : i)));
    } else {
      setItems((prev) => prev.map((i) => (i.id === itemId ? snapshot : i)));
      try {
        await api.undoReplace(itemId, {
          previousStartDate: snapshot.startDate,
          previousBackupStock: snapshot.backupStock,
          previousSnoozeUntil: snapshot.snoozeUntil,
          previousCurrentQuantity: snapshot.currentQuantity,
          previousQuantityUpdatedAt: snapshot.quantityUpdatedAt || snapshot.updatedAt || null,
          previousActiveUnitsData: snapshot.activeUnitsData
            ? (typeof snapshot.activeUnitsData === 'string'
              ? snapshot.activeUnitsData
              : JSON.stringify(snapshot.activeUnitsData))
            : null,
        });
        await loadUserAndItems();
      } catch (err: any) {
        alert(err.message || '復原失敗');
      }
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    if (!user) {
      setGuestItems((prev) =>
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

  const handleDeleteItem = async (id: string): Promise<boolean> => {
    if (!confirm('確定要刪除此物品？')) return false;
    if (!user) {
      try {
        deleteGuestDemoItem(id);
      } catch (error: any) {
        alert(error.message || '訪客資料無法保存到本機');
        return false;
      }
      setGuestItems((prev) => prev.filter((i) => i.id !== id));
      return true;
    }

    const sessionUserId = user.id;
    const itemToDelete = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api.deleteItem(id);
      await loadUserAndItems();
      return true;
    } catch (err: any) {
      if (itemToDelete) {
        setItems((prev) => {
          if (currentUserRef.current?.id !== sessionUserId) return prev;
          const activeStock = currentStockIdRef.current;
          const shouldShow = activeStock === 'all' || itemToDelete.stockId === activeStock;
          if (!shouldShow) return prev;
          if (prev.some((i) => i.id === id)) return prev;
          return [...prev, itemToDelete];
        });
      }
      alert(err.message || '刪除失敗');
      return false;
    }
  };

  const handleBatchReplace = async (ids: string[]) => {
    if (!user) {
      const todayStr = businessDate();
      setGuestItems((prev) =>
        prev.map((i) => {
          if (!ids.includes(i.id)) return i;
          if (i.isStored || (i.trackingMode !== 'cycle' && i.trackingMode !== 'pao' && i.trackingMode !== 'quantity')) return i;
          const newStock = Math.max(0, i.backupStock - 1);
          const newCurrentQty = i.trackingMode === 'quantity' ? (i.initialQuantity || 60) : i.currentQuantity;
          const nowIso = new Date().toISOString();
          return {
            ...i,
            startDate: todayStr,
            backupStock: newStock,
            currentQuantity: newCurrentQty,
            quantityUpdatedAt: nowIso,
            updatedAt: nowIso,
            snoozeUntil: null,
            ...computeItemStatus({
              ...i,
              startDate: todayStr,
              backupStock: newStock,
              currentQuantity: newCurrentQty,
              quantityUpdatedAt: nowIso,
              updatedAt: nowIso,
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
      setGuestItems((prev) =>
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

  const handleBatchDelete = async (ids: string[]): Promise<boolean> => {
    if (!user) {
      try {
        deleteGuestDemoItems(ids);
      } catch (error: any) {
        alert(error.message || '訪客資料無法保存到本機');
        return false;
      }
      setGuestItems((prev) => prev.filter((i) => !ids.includes(i.id)));
      return true;
    }
    const sessionUserId = user.id;
    const itemsToDelete = items.filter((i) => ids.includes(i.id));
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    try {
      await api.batchDelete(ids);
      await loadUserAndItems();
      return true;
    } catch (err: any) {
      setItems((prev) => {
        if (currentUserRef.current?.id !== sessionUserId) return prev;
        const activeStock = currentStockIdRef.current;
        const existingIds = new Set(prev.map((i) => i.id));
        const toRestore = itemsToDelete.filter(
          (i) => !existingIds.has(i.id) && (activeStock === 'all' || i.stockId === activeStock)
        );
        if (toRestore.length === 0) return prev;
        return [...prev, ...toRestore];
      });
      alert(err.message || '批次刪除失敗');
      return false;
    }
  };

  const handleStartUsing = async (id: string) => {
    if (!user) {
      const todayStr = businessDate();
      setGuestItems((prev) =>
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
      const snoozeUntil = addBusinessDays(new Date(), Math.max(1, days));
      setGuestItems((prev) =>
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
    setGuestImportMessage(null);
    setDevices([]);
    setStocks([]);
    setCurrentStockId('all');
    setSettingsStockId(null);
    setItems(mergeGuestItems(DEMO_ITEMS));
    setCurrentTab('dashboard');
  };

  const handleClearDemoItems = () => {
    setDemoCleared(true);
    setItems(readGuestItems());
  };

  const handleRestoreDemoItems = () => {
    restoreGuestDemoItems();
    setItems(mergeGuestItems(DEMO_ITEMS));
  };

  // Guest status is derived locally, so refresh it when a tab crosses midnight
  // or returns from the background. Logged-in statuses remain API authoritative.
  useEffect(() => {
    const refreshGuestStatuses = () => {
      if (user) {
        void loadUserAndItems();
        return;
      }
      setItems((previous) => previous.map((item) => ({ ...item, ...computeItemStatus(item) })));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshGuestStatuses();
    };
    window.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(refreshGuestStatuses, 60_000);
    return () => {
      window.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [user]);

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
      <main {...pageSwipe.handlers} style={{ touchAction: 'pan-y pinch-zoom' }} className="flex-1 max-w-3xl md:max-w-4xl lg:max-w-5xl w-full mx-auto px-4 sm:px-6 pt-3 md:pt-5 main-content-pb">
        <GuestStatusBanner
          signedIn={Boolean(user)}
          localCount={user ? pendingGuestCount : items.filter((item) => !DEMO_ITEM_IDS.has(item.id)).length}
          storageError={guestStorageError}
          importMessage={user ? guestImportMessage : null}
          importing={importingGuest}
          destination={stocks.find((stock) => stock.id === currentStockId && stock.myRole !== 'viewer')?.name || stocks.find((stock) => stock.myRole !== 'viewer')?.name}
          onLogin={() => setIsAuthOpen(true)}
          onImport={() => void importGuestItems(stocks)}
          onRetrySave={() => {
            try { writeGuestItems(items); setGuestStorageError(null); }
            catch (error: any) { setGuestStorageError(error.message); }
          }}
        />
        {(isLoading || loadError) && (
          <div className="mb-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-subtle)] px-3 py-2 text-sm text-[var(--app-muted)]" role={loadError ? 'alert' : 'status'}>
            {loadError || '正在載入最新資料…'}
            {loadError && <button type="button" className="ml-2 underline" onClick={() => loadUserAndItems()}>重試</button>}
          </div>
        )}
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
            onConsume={handleConsume}
            onBatchReplace={handleBatchReplace}
            onBatchStock={handleBatchStock}
            onBatchDelete={handleBatchDelete}
            onRefreshItems={loadUserAndItems}
            user={user}
            onAddGuestItems={(newItems) => setGuestItems((prev) => [...newItems, ...prev])}
            onOpenAuth={() => setIsAuthOpen(true)}
            onClearDemoItems={handleClearDemoItems}
            onRestoreDemoItems={handleRestoreDemoItems}
            onOpenPresetCatalog={handleOpenPresetCatalog}
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
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            devices={devices}
            onOpenAuth={() => setIsAuthOpen(true)}
            onLogout={handleLogout}
            onRefreshUser={loadUserAndItems}
            themeMode={theme}
            onToggleThemeMode={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            currentPalette={palette}
            onSelectPalette={(newPalette) => setPalette(newPalette)}
            onOpenVersionNotice={() => setIsVersionNoticeOpen(true)}
            onOpenPresetCatalog={handleOpenPresetCatalog}
          />
        )}
      </main>

      {/* 5-second Floating Tactile Undo Toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md app-surface border border-[var(--app-border)] shadow-2xl rounded-2xl overflow-hidden sheet-content-animate"
        >
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="ui-label font-semibold text-[var(--app-text)] truncate">
                  已完成更換：{undoToast.itemName}
                </p>
                <p className="ui-meta text-[var(--app-muted)] truncate">
                  備品扣減 1 · 週期已重置為今日
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleUndoReplace}
                className="app-primary ui-button min-h-9 px-3 text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all tactile-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>復原</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                  setUndoToast(null);
                }}
                aria-label="關閉提示"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5s animated countdown progress line */}
          <div className="h-1 bg-[var(--app-surface-subtle)] w-full overflow-hidden">
            <div className="h-full bg-[var(--app-accent)] animate-undo-shrink" />
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        overdueCount={overdueCount}
        restockCount={restockCount}
      />

      {/* Modals */}
      <PwaUpdateNotice busy={isEditing || isVersionNoticeOpen} />
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
        initialTab={itemModalInitialTab}
        itemToEdit={itemToEdit}
        initialPreset={presetForNewItem}
        user={user}
        stocks={stocks}
        currentStockId={currentStockId}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
          setPresetForNewItem(null);
        }}
        onSave={() => loadUserAndItems()}
        onDelete={handleDeleteItem}
        onAddGuestItem={(newItem) => setGuestItems((prev) => [newItem, ...prev])}
        onUpdateGuestItem={(updatedItem) =>
          setGuestItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)))
        }
        onOpenPresetCatalog={handleOpenPresetCatalog}
        onDirectAdd={handleDirectAddPreset}
      />

      <PresetCatalogModal
        isOpen={isPresetCatalogOpen}
        onClose={() => setIsPresetCatalogOpen(false)}
        onSelectPreset={handleSelectPresetForModal}
        onDirectAdd={handleDirectAddPreset}
      />

      <VersionNoticeModal
        isOpen={isVersionNoticeOpen}
        onClose={() => setIsVersionNoticeOpen(false)}
        onAction={() => {
          setIsVersionNoticeOpen(false);
          handleOpenPresetCatalog();
        }}
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
