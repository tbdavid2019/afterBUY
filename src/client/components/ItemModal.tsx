import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Package,
  AlertCircle,
  Camera,
  ImagePlus,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Search,
  Plus,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { ItemResponse, ItemCategory, TrackingMode, UserSession, StockResponse, ActiveUnitInstance } from '../../shared/types.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';
import { businessDate } from '../../shared/date.ts';
import { CATEGORIES, ITEM_PRESETS, ItemPreset } from '../utils/category.ts';
import { ItemBrandBadge } from './ItemBrandBadge.tsx';
import { api } from '../api.ts';
import { useTranslation } from '../i18n/index.tsx';
import { useSwipeGesture } from '../hooks/useSwipeGesture.ts';

const PRESET_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'bathroom', label: '個人衛浴' },
  { id: 'kitchen', label: '廚房飲食' },
  { id: 'medicine', label: '健康保健' },
  { id: 'skincare', label: '美妝保養' },
  { id: 'appliances', label: '家電家居' },
  { id: 'clothing', label: '貼身穿戴' },
  { id: 'electronics', label: '3C 數位' },
  { id: 'general', label: '其他生活' },
];

interface ItemModalProps {
  isOpen: boolean;
  initialTab?: 'presets' | 'form';
  itemToEdit?: ItemResponse | null;
  initialPreset?: ItemPreset | null;
  user?: UserSession | null;
  stocks?: StockResponse[];
  currentStockId?: string;
  onClose: () => void;
  onSave: () => void;
  onDelete?: (id: string) => boolean | Promise<boolean | void> | void;
  onAddGuestItem?: (item: ItemResponse) => void;
  onUpdateGuestItem?: (item: ItemResponse) => void;
  onOpenPresetCatalog?: () => void;
  onDirectAdd?: (preset: ItemPreset) => Promise<void> | void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  initialTab = 'presets',
  itemToEdit,
  initialPreset,
  user,
  stocks = [],
  currentStockId = 'all',
  onClose,
  onSave,
  onDelete,
  onAddGuestItem,
  onUpdateGuestItem,
  onOpenPresetCatalog,
  onDirectAdd,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'presets' | 'form'>('presets');
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategory, setPresetCategory] = useState<string>('all');
  const [directAddingId, setDirectAddingId] = useState<string | null>(null);
  const [directAddedIds, setDirectAddedIds] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('general');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('cycle');
  const [cycleDays, setCycleDays] = useState<number | ''>(90);
  const [startDate, setStartDate] = useState(businessDate());
  const [paoMonths, setPaoMonths] = useState<number | ''>(6);
  const [expiryDate, setExpiryDate] = useState('');
  const [warrantyDate, setWarrantyDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number | ''>(60);
  const [currentQuantity, setCurrentQuantity] = useState<number | ''>('');
  const [dailyUsage, setDailyUsage] = useState<number | ''>(2);
  const [quantityUnit, setQuantityUnit] = useState('顆');
  const [activeUnits, setActiveUnits] = useState<number | ''>(1);
  const [activeUnitsList, setActiveUnitsList] = useState<ActiveUnitInstance[]>([
    { id: 'u-1', label: '位置 1', startDate: businessDate() },
  ]);
  const [backupStock, setBackupStock] = useState<number | ''>(1);
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(1);
  const [price, setPrice] = useState<number | ''>('');
  const [specModel, setSpecModel] = useState('');
  const [location, setLocation] = useState('');
  const [isStored, setIsStored] = useState(false);
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewImgError, setPreviewImgError] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setPreviewImgError(false);
  }, [imageUrl]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const initializedForOpen = useRef(false);
  const hasUnsavedInput = useRef(false);
  const sheetSwipe = useSwipeGesture({
    axis: 'vertical',
    disabled: !isOpen || saving || uploading,
    onSwipe(direction) {
      if (direction !== 'down') return;
      if (hasUnsavedInput.current && !window.confirm('尚未儲存的內容會捨棄，確定關閉？')) return;
      onClose();
    },
  });

  useEffect(() => {
    if (!isOpen) {
      initializedForOpen.current = false;
      return;
    }
    // Initialize once per opening. A refreshed stock list must not erase a draft.
    if (initializedForOpen.current) return;
    initializedForOpen.current = true;
    hasUnsavedInput.current = false;
    setPresetSearch('');
    setPresetCategory('all');
    setSelectedPresetName(null);
    if (itemToEdit) {
      setActiveTab('form');
      setName(itemToEdit.name);
      setCategory(itemToEdit.category);
      setTrackingMode(itemToEdit.trackingMode);
      setCycleDays(itemToEdit.cycleDays || 90);
      setStartDate(itemToEdit.startDate);
      setPaoMonths(itemToEdit.paoMonths || 6);
      setExpiryDate(itemToEdit.expiryDate || '');
      setWarrantyDate(itemToEdit.warrantyDate || '');
      setInitialQuantity(itemToEdit.initialQuantity ?? 60);
      setCurrentQuantity(itemToEdit.currentQuantity !== null && itemToEdit.currentQuantity !== undefined ? itemToEdit.currentQuantity : '');
      setDailyUsage(itemToEdit.dailyUsage ?? 2);
      setQuantityUnit(itemToEdit.quantityUnit || '顆');
      const count = itemToEdit.activeUnits && itemToEdit.activeUnits >= 1 ? itemToEdit.activeUnits : 1;
      setActiveUnits(count);

      let parsedUnits: ActiveUnitInstance[] = [];
      if (itemToEdit.activeUnitsData) {
        try {
          parsedUnits = typeof itemToEdit.activeUnitsData === 'string'
            ? JSON.parse(itemToEdit.activeUnitsData)
            : itemToEdit.activeUnitsData;
        } catch {
          parsedUnits = [];
        }
      }
      if (Array.isArray(parsedUnits) && parsedUnits.length > 0) {
        setActiveUnitsList(parsedUnits);
      } else {
        const defaultLabels = ['位置 1', '位置 2', '位置 3', '位置 4'];
        setActiveUnitsList(
          Array.from({ length: count }, (_, i) => ({
            id: `u-${i + 1}`,
            label: defaultLabels[i] || `位置 ${i + 1}`,
            startDate: itemToEdit.startDate || businessDate(),
          }))
        );
      }

      setBackupStock(itemToEdit.backupStock);
      setMinStockAlert(itemToEdit.minStockAlert);
      setPrice(itemToEdit.price !== null && itemToEdit.price !== undefined ? itemToEdit.price : '');
      setSpecModel(itemToEdit.specModel || '');
      setLocation(itemToEdit.location || '');
      setIsStored(Boolean(itemToEdit.isStored));
      setNotes(itemToEdit.notes || '');
      setImageUrl(itemToEdit.imageUrl || '');
      setSelectedStockId(itemToEdit.stockId || (stocks[0]?.id ?? ''));

      // Auto-expand advanced drawer if any optional/advanced field has custom data
      const hasAdvancedValues = Boolean(
        itemToEdit.imageUrl ||
        (itemToEdit.price !== null && itemToEdit.price !== undefined) ||
        itemToEdit.specModel ||
        itemToEdit.location ||
        itemToEdit.isStored ||
        itemToEdit.notes ||
        (itemToEdit.minStockAlert !== undefined && itemToEdit.minStockAlert !== 1)
      );
      setShowAdvanced(hasAdvancedValues);
    } else {
      // Reset form
      setName('');
      setCategory('bathroom');
      setTrackingMode('cycle');
      setCycleDays(90);
      setStartDate(businessDate());
      setPaoMonths(6);
      setExpiryDate('');
      setWarrantyDate('');
      setInitialQuantity(60);
      setCurrentQuantity('');
      setDailyUsage(2);
      setQuantityUnit('顆');
      setActiveUnits(1);
      setActiveUnitsList([{ id: 'u-1', label: '位置 1', startDate: businessDate() }]);
      setBackupStock(1);
      setMinStockAlert(1);
      setPrice('');
      setSpecModel('');
      setLocation('');
      setIsStored(false);
      setNotes('');
      setImageUrl('');
      setShowAdvanced(false);
      setActiveTab(initialTab);
      if (currentStockId && currentStockId !== 'all') {
        setSelectedStockId(currentStockId);
      } else if (stocks.length > 0) {
        setSelectedStockId(stocks[0].id);
      } else {
        setSelectedStockId('');
      }
      if (initialPreset) {
        handleApplyPreset(initialPreset);
        setActiveTab('form');
      }
    }
    setErrorMessage('');
  }, [itemToEdit, isOpen, currentStockId, stocks, initialPreset, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.isComposing && e.keyCode !== 229) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase();
    return ITEM_PRESETS.filter((p) => {
      const matchCat = presetCategory === 'all' || p.category === presetCategory;
      if (!matchCat) return false;
      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const notesMatch = p.notes ? p.notes.toLowerCase().includes(q) : false;
      const specMatch = p.defaultSpecModel ? p.defaultSpecModel.toLowerCase().includes(q) : false;
      const catMeta = CATEGORIES[p.category as ItemCategory];
      const catMatch = catMeta ? catMeta.label.toLowerCase().includes(q) : false;

      return nameMatch || notesMatch || specMatch || catMatch;
    });
  }, [presetSearch, presetCategory]);

  const handleDirectAddFromPreset = async (preset: ItemPreset) => {
    if (!onDirectAdd) {
      handleApplyPreset(preset);
      setActiveTab('form');
      return;
    }
    setDirectAddingId(preset.name);
    try {
      await onDirectAdd(preset);
      setDirectAddedIds((prev) => ({ ...prev, [preset.name]: true }));
      setTimeout(() => {
        setDirectAddedIds((prev) => ({ ...prev, [preset.name]: false }));
      }, 2500);
    } finally {
      setDirectAddingId(null);
    }
  };

  const handleApplyPreset = (preset: ItemPreset) => {
    hasUnsavedInput.current = true;
    setSelectedPresetName(preset.name);
    setName(preset.name);
    setCategory(preset.category);
    setTrackingMode(preset.trackingMode);
    if (preset.cycleDays) setCycleDays(preset.cycleDays);
    if (preset.paoMonths) setPaoMonths(preset.paoMonths);
    if (preset.initialQuantity !== undefined) setInitialQuantity(preset.initialQuantity);
    if (preset.currentQuantity !== undefined) setCurrentQuantity(preset.currentQuantity);
    if (preset.dailyUsage !== undefined) setDailyUsage(preset.dailyUsage);
    if (preset.quantityUnit) setQuantityUnit(preset.quantityUnit);
    const todayStr = businessDate();
    if (preset.defaultActiveUnits !== undefined && preset.defaultActiveUnits > 1) {
      setActiveUnits(preset.defaultActiveUnits);
      const labels = preset.defaultActiveUnitLabels || ['位置 1', '位置 2', '位置 3', '位置 4'];
      setActiveUnitsList(
        Array.from({ length: preset.defaultActiveUnits }, (_, i) => ({
          id: `u-${i + 1}`,
          label: labels[i] || `位置 ${i + 1}`,
          startDate: todayStr,
        }))
      );
    } else {
      setActiveUnits(1);
      setActiveUnitsList([{ id: 'u-1', label: '位置 1', startDate: todayStr }]);
    }
    if (preset.minStockAlert !== undefined) setMinStockAlert(preset.minStockAlert);
    if (preset.defaultPrice !== undefined) setPrice(preset.defaultPrice);
    if (preset.defaultSpecModel !== undefined) setSpecModel(preset.defaultSpecModel);
    if (preset.notes) setNotes(preset.notes);
    setImageUrl(preset.imageUrl || '');
    setActiveTab('form');
  };

  const handleActiveUnitsCountChange = (newCount: number | '') => {
    if (newCount === '') {
      setActiveUnits('');
      return;
    }
    const validCount = Math.max(1, newCount);
    setActiveUnits(validCount);
    setActiveUnitsList((prev) => {
      if (validCount === prev.length) return prev;
      if (validCount > prev.length) {
        const added: ActiveUnitInstance[] = Array.from(
          { length: validCount - prev.length },
          (_, i) => ({
            id: `u-${prev.length + i + 1}`,
            label: `位置 ${prev.length + i + 1}`,
            startDate: startDate || businessDate(),
          })
        );
        return [...prev, ...added];
      }
      return prev.slice(0, validCount);
    });
  };

  const handleUpdateUnit = (index: number, patch: Partial<ActiveUnitInstance>) => {
    setActiveUnitsList((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...patch };
      }
      return copy;
    });
  };

  const handleAddUnit = () => {
    const nextIdx = activeUnitsList.length + 1;
    setActiveUnits(nextIdx);
    setActiveUnitsList((prev) => [
      ...prev,
      { id: `u-${nextIdx}`, label: `位置 ${nextIdx}`, startDate: businessDate() },
    ]);
  };

  const handleRemoveUnit = (index: number) => {
    if (activeUnitsList.length <= 1) return;
    setActiveUnitsList((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      setActiveUnits(filtered.length);
      return filtered;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage('');
    try {
      if (user) {
        const res = await api.uploadImage(file);
        setImageUrl(res.url);
      } else {
        // Guest mode: instant local base64 preview without auth
        const reader = new FileReader();
        reader.onload = () => {
          setImageUrl(reader.result as string);
          setUploading(false);
        };
        reader.onerror = () => {
          setErrorMessage('讀取圖片失敗');
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || '圖片上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToEdit || !onDelete) return;
    const result = await onDelete(itemToEdit.id);
    if (result !== false) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('請填寫物品名稱');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    const parsedInitQty = trackingMode === 'quantity' ? Number(initialQuantity) || 1 : null;
    const parsedDailyUsage = trackingMode === 'quantity' ? Number(dailyUsage) || 1 : null;
    const parsedCurrentQty = trackingMode === 'quantity'
      ? (currentQuantity === '' ? null : Number(currentQuantity))
      : null;
    const parsedQtyUnit = trackingMode === 'quantity' ? quantityUnit.trim() || '顆' : null;

    const finalActiveUnits = Math.max(1, Number(activeUnits) || 1);
    let finalStartDate = startDate;
    let finalActiveUnitsData: ActiveUnitInstance[] | null = null;
    if (finalActiveUnits > 1 && activeUnitsList.length > 0) {
      finalActiveUnitsData = activeUnitsList.slice(0, finalActiveUnits);
      const sortedDates = finalActiveUnitsData
        .map((u) => u.startDate)
        .filter((d) => Boolean(d))
        .sort();
      if (sortedDates.length > 0) {
        finalStartDate = sortedDates[0];
      }
    }

    try {
      if (!user) {
        // Guest mode: local state update
        if (itemToEdit) {
          const updated: ItemResponse = {
            ...itemToEdit,
            name: name.trim(),
            category,
            trackingMode,
            cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null,
            startDate: finalStartDate,
            paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
            expiryDate: trackingMode === 'expiry' ? expiryDate : null,
            warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
            initialQuantity: parsedInitQty,
            currentQuantity: parsedCurrentQty,
            dailyUsage: parsedDailyUsage,
            quantityUnit: parsedQtyUnit,
            activeUnits: finalActiveUnits,
            activeUnitsData: finalActiveUnitsData,
            backupStock: Number(backupStock),
            minStockAlert: Number(minStockAlert),
            price: price === '' ? null : Number(price),
            specModel: specModel.trim() || null,
            location: location.trim() || null,
            isStored,
            snoozeUntil: itemToEdit.snoozeUntil || null,
            notes: notes.trim() || null,
            imageUrl: imageUrl || null,
            updatedAt: new Date().toISOString(),
            ...computeItemStatus({
              startDate: finalStartDate,
              trackingMode,
              cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null,
              paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
              expiryDate: trackingMode === 'expiry' ? expiryDate : null,
              warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
              initialQuantity: parsedInitQty,
              currentQuantity: parsedCurrentQty,
              dailyUsage: parsedDailyUsage,
              quantityUnit: parsedQtyUnit,
              activeUnits: finalActiveUnits,
              activeUnitsData: finalActiveUnitsData,
              backupStock: Number(backupStock),
              minStockAlert: Number(minStockAlert),
              isStored,
              snoozeUntil: itemToEdit.snoozeUntil || null,
            }),
          };
          onUpdateGuestItem?.(updated);
        } else {
          const newItem: ItemResponse = {
            id: `guest-${crypto.randomUUID()}`,
            userId: 'guest',
            name: name.trim(),
            category,
            trackingMode,
            cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null,
            startDate: finalStartDate,
            paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
            expiryDate: trackingMode === 'expiry' ? expiryDate : null,
            warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
            initialQuantity: parsedInitQty,
            currentQuantity: parsedCurrentQty,
            dailyUsage: parsedDailyUsage,
            quantityUnit: parsedQtyUnit,
            activeUnits: finalActiveUnits,
            activeUnitsData: finalActiveUnitsData,
            backupStock: Number(backupStock),
            minStockAlert: Number(minStockAlert),
            price: price === '' ? null : Number(price),
            specModel: specModel.trim() || null,
            location: location.trim() || null,
            isStored,
            snoozeUntil: null,
            notes: notes.trim() || null,
            imageUrl: imageUrl || null,
            calendarSequence: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...computeItemStatus({
              startDate: finalStartDate,
              trackingMode,
              cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null,
              paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
              expiryDate: trackingMode === 'expiry' ? expiryDate : null,
              warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
              initialQuantity: parsedInitQty,
              currentQuantity: parsedCurrentQty,
              dailyUsage: parsedDailyUsage,
              quantityUnit: parsedQtyUnit,
              activeUnits: finalActiveUnits,
              activeUnitsData: finalActiveUnitsData,
              backupStock: Number(backupStock),
              minStockAlert: Number(minStockAlert),
              isStored,
              snoozeUntil: null,
            }),
          };
          onAddGuestItem?.(newItem);
        }
        onClose();
        return;
      }

      if (itemToEdit) {
        await api.updateItem(itemToEdit.id, {
          name: name.trim(),
          category,
          trackingMode,
          cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null as any,
          startDate: finalStartDate,
          paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null as any,
          expiryDate: trackingMode === 'expiry' ? expiryDate : null as any,
          warrantyDate: trackingMode === 'warranty' ? warrantyDate : null as any,
          initialQuantity: parsedInitQty as any,
          currentQuantity: parsedCurrentQty as any,
          dailyUsage: parsedDailyUsage as any,
          quantityUnit: parsedQtyUnit as any,
          activeUnits: finalActiveUnits,
          activeUnitsData: finalActiveUnitsData ? JSON.stringify(finalActiveUnitsData) : (null as any),
          backupStock: Number(backupStock),
          minStockAlert: Number(minStockAlert),
          price: price === '' ? null : Number(price),
          specModel: specModel.trim() || null,
          location: location.trim() || null,
          isStored,
          notes: notes.trim() || null as any,
          imageUrl: imageUrl || null as any,
        });
      } else {
        await api.createItem({
          stockId: selectedStockId || undefined,
          name: name.trim(),
          category,
          trackingMode,
          cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : undefined,
          startDate: finalStartDate,
          paoMonths: trackingMode === 'pao' ? Number(paoMonths) : undefined,
          expiryDate: trackingMode === 'expiry' ? expiryDate : undefined,
          warrantyDate: trackingMode === 'warranty' ? warrantyDate : undefined,
          initialQuantity: parsedInitQty ?? undefined,
          currentQuantity: parsedCurrentQty ?? undefined,
          dailyUsage: parsedDailyUsage ?? undefined,
          quantityUnit: parsedQtyUnit ?? undefined,
          activeUnits: finalActiveUnits,
          activeUnitsData: finalActiveUnitsData ? JSON.stringify(finalActiveUnitsData) : undefined,
          backupStock: Number(backupStock),
          minStockAlert: Number(minStockAlert),
          price: price === '' ? null : Number(price),
          specModel: specModel.trim() || null,
          location: location.trim() || null,
          isStored,
          notes: notes.trim() || undefined,
          imageUrl: imageUrl || undefined,
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '儲存失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  const filledOptionalCount = [
    Boolean(imageUrl),
    Boolean(price !== '' && price !== null && price !== undefined),
    Boolean(specModel.trim()),
    Boolean(location.trim()),
    Boolean(isStored),
    Boolean(notes.trim()),
    minStockAlert !== 1,
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop-animate"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="item-modal-title" style={sheetSwipe.offset > 0 ? { animation: 'none', transform: `translateY(${sheetSwipe.offset}px)` } : undefined} className="app-surface border border-[var(--app-border)] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden sheet-content-animate sm:modal-content-animate">
        {/* Header */}
        <div {...sheetSwipe.handlers} data-swipe-surface="sheet" style={{ touchAction: 'none' }} className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--app-border)]">
          <div className="min-w-0 pr-2">
            <h2 id="item-modal-title" className="ui-section-title text-[var(--app-text)] tracking-tight">
              {itemToEdit ? '編輯物品' : '新增追蹤物品'}
            </h2>
            <p className="sm:hidden ui-meta text-[var(--app-muted)]">從標題往下滑可關閉</p>
            {!itemToEdit && (
              <p className="ui-meta text-[var(--app-muted)] text-xs mt-0.5 truncate">
                {activeTab === 'presets' ? '選一個後會帶入圖片、名稱、分類與建議週期' : '自訂名稱、模式與生活週期規格'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            className="app-control ui-button min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-xl border hover:border-[var(--app-accent)] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Segmented Mode Switcher (When creating new item) */}
        {!itemToEdit && (
          <div className="px-5 pt-3 pb-2 border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] shrink-0">
            <div className="grid grid-cols-2 p-1 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl w-full shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`min-h-9 rounded-lg ui-button text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'presets'
                    ? 'app-primary shadow-xs'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>常用耗材範本庫</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`min-h-9 rounded-lg ui-button text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'form'
                    ? 'app-primary shadow-xs'
                    : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>自訂填寫表單</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Full Searchable Presets Catalog (Matching User Reference Image) */}
        {activeTab === 'presets' && !itemToEdit ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search Input & Category Pills */}
            <div className="p-4 border-b border-[var(--app-border)] bg-[var(--app-surface-subtle)] space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--app-muted-low)]" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  placeholder="搜尋物品名稱或備註（如：魚油、垃圾袋、衛生紙）"
                  className="w-full bg-[var(--app-surface)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl pl-10 pr-9 min-h-11 ui-body text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted-low)] transition-all shadow-xs"
                />
                {presetSearch && (
                  <button
                    type="button"
                    onClick={() => setPresetSearch('')}
                    aria-label="清除搜尋"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] p-1 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-sm">
                {PRESET_CATEGORIES.map((cat) => {
                  const isSelected = presetCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPresetCategory(cat.id)}
                      className={`flex-shrink-0 min-h-8 px-3.5 rounded-full ui-button transition-all text-xs font-bold border ${
                        isSelected
                          ? 'app-primary shadow-xs border-transparent'
                          : 'app-surface border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[var(--app-muted)] font-semibold px-1 pb-1">
                <span>共 {filteredPresets.length} 款生活耗材範本</span>
                <span>點擊卡片帶入表單 · 或點直接加入</span>
              </div>

              {filteredPresets.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl app-primary-soft border mx-auto flex items-center justify-center">
                    <SlidersHorizontal className="w-5 h-5 text-[var(--app-accent-strong)]" />
                  </div>
                  <p className="ui-body text-[var(--app-text)] font-semibold">找不到符合「{presetSearch}」的耗材範本</p>
                  <p className="ui-meta text-[var(--app-muted)]">您可以自訂名稱新增物品，或嘗試更換關鍵字。</p>
                  <button
                    type="button"
                    onClick={() => {
                      setName(presetSearch.trim() || '自訂耗材');
                      setActiveTab('form');
                    }}
                    className="app-primary ui-button min-h-10 px-4 rounded-xl text-sm font-bold shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    以「{presetSearch || '自訂耗材'}」開啟建立表單
                  </button>
                </div>
              ) : (
                filteredPresets.map((preset) => {
                  const isAdded = directAddedIds[preset.name];
                  const isAdding = directAddingId === preset.name;
                  const catMeta = CATEGORIES[preset.category as ItemCategory];

                  return (
                    <div
                      key={preset.name}
                      onClick={() => {
                        handleApplyPreset(preset);
                        setActiveTab('form');
                      }}
                      className="app-surface border border-[var(--app-border)] hover:border-[var(--app-accent)] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:shadow-sm cursor-pointer transition-all active:scale-[0.99] group"
                    >
                      {/* Left: Avatar / Badge */}
                      <div className="shrink-0">
                        <ItemBrandBadge
                          name={preset.name}
                          category={preset.category}
                          imageUrl={preset.imageUrl}
                          specModel={preset.defaultSpecModel}
                          size="lg"
                          shape="rounded"
                        />
                      </div>

                      {/* Center: Details */}
                      <div className="min-w-0 flex-1">
                        <h3 className="ui-item-title text-[var(--app-text)] group-hover:text-[var(--app-accent-strong)] transition-colors truncate">
                          {preset.name}
                        </h3>
                        {preset.notes && (
                          <p className="ui-meta text-[var(--app-muted)] truncate mt-0.5">
                            {preset.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="ui-badge bg-[var(--app-surface-subtle)] border text-[var(--app-text)] font-semibold text-[11px] px-2 py-0.5 rounded-full">
                            {preset.trackingMode === 'cycle' && preset.cycleDays
                              ? `${preset.cycleDays} 天週期`
                              : preset.trackingMode === 'quantity' && preset.initialQuantity
                              ? `${preset.initialQuantity} ${preset.quantityUnit || '顆'}`
                              : preset.trackingMode === 'pao' && preset.paoMonths
                              ? `PAO ${preset.paoMonths} 個月`
                              : '週期更換'}
                          </span>
                          {catMeta && (
                            <span className="ui-badge bg-[var(--app-surface-subtle)] border text-[var(--app-muted)] font-medium text-[11px] px-2 py-0.5 rounded-full">
                              {catMeta.label}
                            </span>
                          )}
                          {preset.defaultSpecModel && (
                            <span className="ui-badge text-[var(--app-muted-low)] text-[11px] truncate max-w-[120px]">
                              {preset.defaultSpecModel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Direct Add Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDirectAddFromPreset(preset);
                        }}
                        disabled={isAdding}
                        className={`shrink-0 min-h-9 px-3 rounded-xl ui-button text-xs font-bold flex items-center gap-1 transition-all ${
                          isAdded
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'app-primary-soft text-[var(--app-accent-strong)] hover:app-primary border border-[var(--app-accent)]/30 active:scale-95'
                        }`}
                        title="點擊直接加入當前備品庫"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>已加入</span>
                          </>
                        ) : isAdding ? (
                          <span>加入中...</span>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>直接加入</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom bar of presets tab */}
            <div className="p-3.5 border-t border-[var(--app-border)] bg-[var(--app-surface-subtle)] flex items-center justify-between shrink-0">
              <span className="ui-meta text-[var(--app-muted)] text-xs">
                想要自訂特殊規格？
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="app-control ui-button min-h-9 px-3.5 rounded-xl border hover:border-[var(--app-accent)] text-xs font-semibold text-[var(--app-text)] flex items-center gap-1.5"
              >
                <span>切換至自訂表單</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Custom Form Body */
          <form onChangeCapture={() => { hasUnsavedInput.current = true; }} onClickCapture={(event) => { if ((event.target as HTMLElement).closest('button')) hasUnsavedInput.current = true; }} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {!user && (
              <div className="app-primary-soft border rounded-xl px-3.5 py-2.5 ui-meta flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-[var(--app-accent-strong)]" />
                <span>{t('guestModeModalHint')}</span>
              </div>
            )}

            {/* Active Preset indicator or switch to presets prompt */}
            {!itemToEdit && selectedPresetName ? (
              <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-2xl px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-xl app-primary-soft flex items-center justify-center shrink-0 border border-[var(--app-accent)]/20">
                    <Sparkles className="w-4 h-4 text-[var(--app-accent-strong)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="ui-meta text-[11px] text-[var(--app-muted)]">已帶入生活範本規格</p>
                    <p className="ui-body text-xs font-bold text-[var(--app-text)] truncate">{selectedPresetName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className="app-control ui-button min-h-8 px-3 rounded-lg border hover:border-[var(--app-accent)] text-xs font-semibold text-[var(--app-accent-strong)] shrink-0"
                >
                  重新選擇
                </button>
              </div>
            ) : !itemToEdit ? (
              <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="ui-meta text-[var(--app-muted)]">填寫自訂物品規格，或從範本快速帶入</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className="ui-button font-bold text-[var(--app-accent-strong)] hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>瀏覽耗材範本庫</span>
                </button>
              </div>
            ) : null}

          {/* Item Name */}
          <div>
            <label className="block ui-label font-semibold text-[var(--app-text)] mb-1">物品名稱 *</label>
            <input
              type="text"
              required
              placeholder="例如：電動牙刷刷頭、Brita 濾芯、防曬乳"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 min-h-11 ui-body text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted-low)]"
            />
          </div>

          {/* Stock Space Selector */}
          {user && stocks.length > 0 && !itemToEdit && (
            <div>
              <label className="block ui-label font-semibold text-[var(--app-text)] mb-1">所屬備品庫 (Stock)</label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full bg-[var(--app-surface-subtle)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 min-h-11 ui-body text-[var(--app-text)] outline-none"
              >
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name} ({s.myRole === 'owner' ? '擁有者' : s.myRole === 'admin' ? '管理員' : '成員'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Picker */}
          <div>
            <label className="block ui-label font-semibold text-[var(--app-text)] mb-1.5">類別</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`min-h-11 ui-button px-1 rounded-xl border text-center transition-all ${
                    category === cat.id
                      ? 'app-primary font-semibold shadow-sm'
                      : 'app-control hover:border-[var(--app-accent)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Mode */}
          <div>
            <label className="block ui-label font-semibold text-[var(--app-text)] mb-1.5">追蹤模式</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'cycle', label: '週期更換' },
                { id: 'pao', label: '開封期 (PAO)' },
                { id: 'expiry', label: '有效期限' },
                { id: 'warranty', label: '保固倒數' },
                { id: 'quantity', label: '數量耗用' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTrackingMode(m.id as TrackingMode)}
                  className={`min-h-11 ui-button px-2 rounded-xl border text-center transition-all ${
                    trackingMode === m.id
                      ? 'app-primary-soft font-semibold border-[var(--app-accent)]'
                      : 'app-control hover:border-[var(--app-accent)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic mode inputs */}
          <div className="app-surface-subtle border border-[var(--app-border)] p-3.5 rounded-2xl space-y-3">
            {trackingMode === 'cycle' && (
              <div>
                <label className="block ui-label font-medium text-[var(--app-text)] mb-1">更換週期 (天數)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={cycleDays}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCycleDays('');
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) setCycleDays(Math.max(1, num));
                      }
                    }}
                    onBlur={() => {
                      if (cycleDays === '' || cycleDays < 1) setCycleDays(90);
                    }}
                    className="w-28 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none font-bold ui-body tabular-nums"
                  />
                  <div className="flex gap-1.5">
                    {[30, 90, 180, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCycleDays(d)}
                        className={`min-h-9 px-3 ui-button rounded-lg border tabular-nums ${
                          cycleDays === d ? 'app-primary font-bold shadow-sm' : 'app-control'
                        }`}
                      >
                        {d}天
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {trackingMode === 'pao' && (
              <div>
                <label className="block ui-label font-medium text-[var(--app-text)] mb-1">開封後使用壽命 (PAO 月數)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={paoMonths}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPaoMonths('');
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) setPaoMonths(Math.max(1, num));
                      }
                    }}
                    onBlur={() => {
                      if (paoMonths === '' || paoMonths < 1) setPaoMonths(6);
                    }}
                    className="w-28 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none font-bold ui-body tabular-nums"
                  />
                  <div className="flex gap-1.5">
                    {[1, 3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaoMonths(m)}
                        className={`min-h-9 px-3 ui-button rounded-lg border tabular-nums ${
                          paoMonths === m ? 'app-primary font-bold shadow-sm' : 'app-control'
                        }`}
                      >
                        {m}個月
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {trackingMode === 'expiry' && (
              <div>
                <label className="block ui-label font-medium text-[var(--app-text)] mb-1">有效期限日期</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body tabular-nums"
                />
              </div>
            )}

            {trackingMode === 'warranty' && (
              <div>
                <label className="block ui-label font-medium text-[var(--app-text)] mb-1">保固到期日期</label>
                <input
                  type="date"
                  required
                  value={warrantyDate}
                  onChange={(e) => setWarrantyDate(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body tabular-nums"
                />
              </div>
            )}

            {trackingMode === 'quantity' && (
              <div className="space-y-3">
                {(() => {
                  const capacityLabel = quantityUnit === '抽'
                    ? '單包總抽數 *'
                    : quantityUnit === '蓋'
                    ? '單瓶總量 (瓶蓋次數) *'
                    : quantityUnit === '次'
                    ? '單件總使用次數 *'
                    : quantityUnit === '片'
                    ? '單盒總片數 *'
                    : ['顆', '錠'].includes(quantityUnit)
                    ? '單瓶 / 單盒總量 *'
                    : '單瓶 / 包總容量 *';

                  const usageLabel = quantityUnit === '抽'
                    ? '每日平均耗用 (抽) *'
                    : quantityUnit === '蓋'
                    ? '每日平均耗用 (蓋) *'
                    : quantityUnit === '次'
                    ? '每日平均次數 *'
                    : '每日平均耗用率 *';

                  const containerWord = ['抽', '包'].includes(quantityUnit)
                    ? '單包'
                    : ['蓋', 'ml', '毫升'].includes(quantityUnit)
                    ? '單瓶'
                    : ['顆', '錠', '片'].includes(quantityUnit)
                    ? '單盒'
                    : '單件';

                  const isTissue = quantityUnit === '抽' || name.includes('衛生紙') || name.includes('面紙');
                  const isDetergent = quantityUnit === '蓋' || name.includes('洗衣精') || name.includes('洗碗精');

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block ui-label font-medium text-[var(--app-text)] mb-1">
                            {capacityLabel}
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder={quantityUnit === '抽' ? '例如：120' : quantityUnit === '蓋' ? '例如：30' : '例如：60'}
                            value={initialQuantity}
                            onChange={(e) => setInitialQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none font-bold ui-body tabular-nums"
                          />
                          {isTissue && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[
                                { label: '100抽', val: 100 },
                                { label: '120抽 (好市多/一般)', val: 120 },
                                { label: '250抽 (懸掛式)', val: 250 },
                                { label: '1100抽 (大包懸掛)', val: 1100 },
                              ].map((chip) => (
                                <button
                                  key={chip.val}
                                  type="button"
                                  onClick={() => {
                                    setInitialQuantity(chip.val);
                                    setQuantityUnit('抽');
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs border transition-colors ${
                                    initialQuantity === chip.val ? 'app-primary font-bold shadow-xs' : 'app-control'
                                  }`}
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {isDetergent && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[
                                { label: '30蓋 (約30次)', val: 30 },
                                { label: '40蓋', val: 40 },
                                { label: '50蓋 (大容量)', val: 50 },
                              ].map((chip) => (
                                <button
                                  key={chip.val}
                                  type="button"
                                  onClick={() => {
                                    setInitialQuantity(chip.val);
                                    setQuantityUnit('蓋');
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs border transition-colors ${
                                    initialQuantity === chip.val ? 'app-primary font-bold shadow-xs' : 'app-control'
                                  }`}
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block ui-label font-medium text-[var(--app-text)] mb-1">
                            {usageLabel}
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            placeholder={quantityUnit === '抽' ? '例如：10' : quantityUnit === '蓋' ? '例如：1' : '例如：2'}
                            value={dailyUsage}
                            onChange={(e) => setDailyUsage(e.target.value === '' ? '' : Math.max(0.01, parseFloat(e.target.value) || 1))}
                            className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none font-bold ui-body tabular-nums"
                          />
                          {isTissue && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[
                                { label: '5抽/天', val: 5 },
                                { label: '10抽/天 (常規)', val: 10 },
                                { label: '15抽/天', val: 15 },
                              ].map((chip) => (
                                <button
                                  key={chip.val}
                                  type="button"
                                  onClick={() => setDailyUsage(chip.val)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs border transition-colors ${
                                    dailyUsage === chip.val ? 'app-primary font-bold shadow-xs' : 'app-control'
                                  }`}
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>
                          )}
                          {isDetergent && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {[
                                { label: '0.5蓋 (兩天洗一次)', val: 0.5 },
                                { label: '1蓋 (每天洗一槽)', val: 1 },
                                { label: '2蓋 (每天洗兩槽)', val: 2 },
                              ].map((chip) => (
                                <button
                                  key={chip.val}
                                  type="button"
                                  onClick={() => setDailyUsage(chip.val)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs border transition-colors ${
                                    dailyUsage === chip.val ? 'app-primary font-bold shadow-xs' : 'app-control'
                                  }`}
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Unit picker & Custom input */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="ui-label font-medium text-[var(--app-text)]">計算單位</label>
                          <span className="ui-meta text-[var(--app-muted)]">點擊快選或自訂</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {['顆', '錠', '包', '個', '片', '入', '抽', '次', '蓋', '捲'].map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => {
                                setQuantityUnit(u);
                                if (u === '抽' && (initialQuantity === 60 || initialQuantity === '')) {
                                  setInitialQuantity(120);
                                  setDailyUsage(10);
                                } else if (u === '蓋' && (initialQuantity === 60 || initialQuantity === '')) {
                                  setInitialQuantity(30);
                                  setDailyUsage(1);
                                }
                              }}
                              className={`min-h-8 px-2.5 ui-button rounded-lg border text-xs ${
                                quantityUnit === u ? 'app-primary font-bold shadow-sm' : 'app-control'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                          <input
                            type="text"
                            placeholder="自訂"
                            value={['顆', '錠', '包', '個', '片', '入', '抽', '次', '蓋', '捲'].includes(quantityUnit) ? '' : quantityUnit}
                            onChange={(e) => setQuantityUnit(e.target.value)}
                            className="w-16 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg px-2 min-h-8 text-xs text-[var(--app-text)] outline-none text-center"
                          />
                        </div>
                      </div>

                      {/* Current remaining override (optional) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="ui-label font-medium text-[var(--app-text)]">
                            目前開瓶現存剩餘（選填）
                          </label>
                          <span className="ui-meta text-[var(--app-muted)]">留空則依起始日天數自動扣減</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder={`預設自動計算（新開即滿 ${initialQuantity || (quantityUnit === '抽' ? 120 : quantityUnit === '蓋' ? 30 : 60)} ${quantityUnit}）`}
                          value={currentQuantity}
                          onChange={(e) => setCurrentQuantity(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body tabular-nums placeholder:text-[var(--app-muted-low)]"
                        />
                      </div>

                      {/* Live estimation hint */}
                      {Number(initialQuantity) > 0 && Number(dailyUsage) > 0 && (
                        <div className="app-primary-soft border border-[var(--app-accent)]/20 rounded-xl px-3 py-2 ui-meta flex items-center justify-between">
                          <span className="text-[var(--app-text)]">
                            💡 {containerWord} {initialQuantity} {quantityUnit} ÷ 每天 {dailyUsage} {quantityUnit}
                          </span>
                          <span className="font-bold text-[var(--app-accent-strong)] tabular-nums">
                            約可使用 {Math.ceil(Number(initialQuantity) / Number(dailyUsage))} 天
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block ui-label font-medium text-[var(--app-text)] mb-1">
                {trackingMode === 'pao' ? '開封日期' : trackingMode === 'warranty' ? '購買日期' : trackingMode === 'quantity' ? '本次開瓶 / 開封日期' : '本次啟用 / 更換日期'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body tabular-nums"
              />
            </div>
          </div>

          {/* Active In-Use Units & Backup Stock Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column: Active Units (Concurrently in-use / opened) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="ui-label font-semibold text-[var(--app-text)] flex items-center gap-1 truncate">
                    <span>同時在用數量</span>
                  </label>
                  <span className="ui-meta text-[var(--app-accent-strong)] font-semibold shrink-0">開封現役</span>
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={activeUnits}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      handleActiveUnitsCountChange('');
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) handleActiveUnitsCountChange(num);
                    }
                  }}
                  onBlur={() => {
                    if (activeUnits === '' || activeUnits < 1) {
                      handleActiveUnitsCountChange(1);
                    }
                  }}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 min-h-11 text-[var(--app-text)] outline-none font-bold ui-body tabular-nums"
                  title="多處同時在用數量（如多間浴室各放 1 瓶洗髮精，或客廳、房間同時開 4 包衛生紙）"
                />
                <p className="ui-meta text-[var(--app-muted)] mt-1 text-[11px] leading-tight">
                  多處現役（如多間衛浴或客廳餐桌各開）
                </p>
              </div>

              {/* Right Column: Backup Stock (Cabinet / drawer reserves) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="ui-label font-semibold text-[var(--app-text)] truncate">
                    <span>未拆封備品</span>
                  </label>
                  <span className="ui-meta text-[var(--app-muted)] shrink-0">櫃子庫存</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={backupStock}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setBackupStock('');
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) setBackupStock(Math.max(0, num));
                    }
                  }}
                  onBlur={() => {
                    if (backupStock === '') {
                      setBackupStock(0);
                    }
                  }}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 min-h-11 text-[var(--app-text)] outline-none font-bold ui-body tabular-nums"
                />
                <p className="ui-meta text-[var(--app-muted)] mt-1 text-[11px] leading-tight">
                  {trackingMode === 'quantity' ? '用盡開新備品時自動扣 1' : '換新時從備品扣 1'}
                </p>
              </div>
            </div>

            {/* Total Inventory Summary Banner */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[var(--app-surface-subtle)] border border-[var(--app-border)] text-xs text-[var(--app-muted)]">
              <span className="truncate">
                庫存彙總：
                <strong className="text-[var(--app-accent-strong)] font-bold">{activeUnits || 1}</strong> {trackingMode === 'quantity' ? (quantityUnit || '件') : '件'}使用中 + <strong className="text-[var(--app-text)] font-bold">{backupStock === '' ? 0 : backupStock}</strong> 件備品
              </span>
              <span className="shrink-0 font-bold text-[var(--app-text)] ml-2">
                共 {(Number(activeUnits) || 1) + (Number(backupStock) || 0)} 件
              </span>
            </div>

            {/* Multi-Unit Concurrent Breakdown Editor */}
            {(Number(activeUnits) || 1) > 1 && (
              <div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--app-accent)]/30 bg-[var(--app-surface-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--app-text)] flex items-center gap-1.5">
                      <span>同時在用各處設置 ({activeUnitsList.length} 處現役)</span>
                    </h4>
                    <p className="ui-meta text-[var(--app-muted)] text-[11px] mt-0.5">
                      各處記錄名稱與獨立啟用時間，日後可針對各位置個別換新
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddUnit}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--app-accent)] text-[var(--app-accent-strong)] text-xs font-bold hover:bg-[var(--app-accent)]/10 tactile-press shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增位置</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {activeUnitsList.map((unit, idx) => (
                    <div
                      key={unit.id || idx}
                      className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] shadow-2xs"
                    >
                      <span className="w-5 text-center text-xs font-black text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          value={unit.label}
                          onChange={(e) => handleUpdateUnit(idx, { label: e.target.value })}
                          placeholder="例如：主臥浴室、客廳"
                          className="w-full bg-transparent border-none text-xs sm:text-sm font-bold text-[var(--app-text)] outline-none"
                        />
                      </div>
                      <div className="w-36 sm:w-40 shrink-0">
                        <input
                          type="date"
                          required
                          value={unit.startDate}
                          onChange={(e) => handleUpdateUnit(idx, { startDate: e.target.value })}
                          className="w-full bg-[var(--app-surface-subtle)] border border-[var(--app-border)] rounded-lg px-2 py-1 text-xs text-[var(--app-text)] outline-none tabular-nums"
                          title="該處開始使用或開封日期"
                        />
                      </div>
                      {activeUnitsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(idx)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 tactile-press"
                          title="移除此位置"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progressive Disclosure: Advanced / Optional Fields Accordion */}
          <div className="border border-[var(--app-border)] rounded-2xl overflow-hidden bg-[var(--app-surface-subtle)]/40 transition-colors">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-expanded={showAdvanced}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--app-surface-subtle)] transition-colors tactile-press"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--app-bg)] border border-[var(--app-border)] flex items-center justify-center shrink-0 text-[var(--app-accent-strong)]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="ui-label font-semibold text-[var(--app-text)] flex items-center gap-1.5">
                    更多詳細資料 (選填)
                  </span>
                  <span className="ui-meta text-[var(--app-muted)] block truncate text-xs">
                    照片、規格型號、金額、存放位置、備忘
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {filledOptionalCount > 0 && (
                  <span className="app-primary-soft ui-badge font-bold px-2 py-0.5 rounded-full text-xs">
                    已填 {filledOptionalCount} 項
                  </span>
                )}
                {showAdvanced ? (
                  <ChevronUp className="w-5 h-5 text-[var(--app-muted)]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--app-muted)]" />
                )}
              </div>
            </button>

            {showAdvanced && (
              <div className="p-4 pt-2 space-y-4 border-t border-[var(--app-border)]/70">
                {/* Photo & Image Upload/Camera Section */}
                <div className="app-surface-subtle border border-[var(--app-border)] p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="ui-label font-semibold text-[var(--app-text)] flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[var(--app-accent-strong)]" />
                      <span>物品實體照片 / 插圖</span>
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="ui-meta text-rose-600 dark:text-rose-400 hover:text-rose-500 font-semibold transition-colors"
                      >
                        移除照片
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Preview Thumbnail */}
                    <div className="w-16 h-16 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                      {imageUrl && !previewImgError ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => setPreviewImgError(true)}
                        />
                      ) : (
                        <div className="text-[var(--app-muted)] flex flex-col items-center">
                          <Camera className="w-5 h-5 mb-0.5 text-[var(--app-muted-low)]" />
                          <span className="ui-badge font-medium">未設定</span>
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-[var(--app-accent-strong)] animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Camera & Gallery Action Buttons */}
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="file"
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => cameraInputRef.current?.click()}
                        className="app-control ui-button min-h-11 flex items-center justify-center gap-1.5 px-2 rounded-xl text-[var(--app-text)] hover:border-[var(--app-accent)] active:scale-95 transition-transform border border-[var(--app-border)]"
                      >
                        <Camera className="w-4 h-4 text-[var(--app-accent-strong)]" />
                        <span>拍照</span>
                      </button>

                      <input
                        type="file"
                        ref={galleryInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => galleryInputRef.current?.click()}
                        className="app-control ui-button min-h-11 flex items-center justify-center gap-1.5 px-2 rounded-xl text-[var(--app-text)] hover:border-[var(--app-accent)] active:scale-95 transition-transform border border-[var(--app-border)]"
                      >
                        <ImagePlus className="w-4 h-4 text-[var(--app-accent-strong)]" />
                        <span>相簿選圖</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Price & Spec Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block ui-label font-semibold text-[var(--app-text)] mb-1">購買金額 (NT$)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="例如：450"
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body tabular-nums placeholder:text-[var(--app-muted-low)]"
                    />
                  </div>
                  <div>
                    <label className="block ui-label font-semibold text-[var(--app-text)] mb-1">規格 / 型號</label>
                    <input
                      type="text"
                      placeholder="例如：3號(AA) / 003黑色"
                      value={specModel}
                      onChange={(e) => setSpecModel(e.target.value)}
                      className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body placeholder:text-[var(--app-muted-low)]"
                    />
                  </div>
                </div>

                {/* Min Stock Alert */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="ui-label font-semibold text-[var(--app-text)]">補貨警示門檻 (低於此數觸發補貨)</label>
                    <span className="ui-meta text-[var(--app-muted)]">預設為 1</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setMinStockAlert('');
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) setMinStockAlert(Math.max(0, num));
                      }
                    }}
                    onBlur={() => {
                      if (minStockAlert === '') {
                        setMinStockAlert(1);
                      }
                    }}
                    className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 min-h-11 text-[var(--app-text)] outline-none ui-body tabular-nums"
                  />
                </div>

                {/* Location */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="ui-label font-semibold text-[var(--app-text)]">存放位置 (選填)</label>
                    <span className="ui-meta text-[var(--app-muted)]">方便找備品與打掃</span>
                  </div>
                  <input
                    type="text"
                    placeholder="例如：主臥衛浴、廚房水槽下、陽台、儲藏室..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 min-h-11 text-[var(--app-text)] outline-none ui-body placeholder:text-[var(--app-muted-low)]"
                  />
                  <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-0.5">
                    {['衛浴', '廚房', '臥室', '客廳', '陽台', '儲藏室', '隨身包', '辦公室'].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLocation(loc)}
                        className={`ui-button min-h-9 px-3.5 rounded-full border transition-all shrink-0 ${
                          location === loc
                            ? 'app-primary font-semibold shadow-sm'
                            : 'app-control hover:border-[var(--app-accent)]'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stored / Inactive Mode Toggle */}
                <div className="app-surface-subtle border border-[var(--app-border)] p-3.5 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <label className="ui-label font-semibold text-[var(--app-text)] flex items-center gap-1.5 cursor-pointer">
                      <Package className="w-4 h-4 text-[var(--app-accent-strong)]" />
                      <span>先存放，還沒有要開始使用</span>
                    </label>
                    <p className="ui-meta text-[var(--app-muted)] mt-0.5 leading-relaxed">
                      囤貨備品專用。開啟後暫不啟動倒數，日後在物品卡片點擊「開始使用」才開始計時。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsStored(!isStored)}
                    aria-label={isStored ? '取消存放狀態' : '設定為先存放'}
                    className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-1 flex items-center ${
                      isStored ? 'app-primary justify-end' : 'bg-[var(--app-border)] justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block ui-label font-semibold text-[var(--app-text)] mb-1">備註說明 (選填)</label>
                  <input
                    type="text"
                    placeholder="例如：型號 P-3101、第二道活性碳"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3.5 min-h-11 text-[var(--app-text)] outline-none ui-body placeholder:text-[var(--app-muted-low)]"
                  />
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="ui-meta text-rose-500 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
              {errorMessage}
            </div>
          )}

          {/* Submit / Delete Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {itemToEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="ui-button min-h-12 px-4 flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 font-semibold rounded-xl tactile-press transition-all shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>刪除物品</span>
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="app-primary ui-button flex-1 min-h-12 flex items-center justify-center gap-2 hover:brightness-105 font-bold rounded-xl shadow-lg shadow-[var(--app-accent)]/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{itemToEdit ? '儲存變更' : '建立物品'}</span>}
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
);
};
