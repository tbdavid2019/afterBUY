import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Calendar, Package, AlertCircle, Camera, ImagePlus, Loader2, Check } from 'lucide-react';
import { ItemResponse, ItemCategory, TrackingMode, UserSession, StockResponse } from '../../shared/types.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';
import { CATEGORIES, ITEM_PRESETS, ItemPreset } from '../utils/category.ts';
import { api } from '../api.ts';

interface ItemModalProps {
  isOpen: boolean;
  itemToEdit?: ItemResponse | null;
  user?: UserSession | null;
  stocks?: StockResponse[];
  currentStockId?: string;
  onClose: () => void;
  onSave: () => void;
  onAddGuestItem?: (item: ItemResponse) => void;
  onUpdateGuestItem?: (item: ItemResponse) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  itemToEdit,
  user,
  stocks = [],
  currentStockId = 'all',
  onClose,
  onSave,
  onAddGuestItem,
  onUpdateGuestItem,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('general');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('cycle');
  const [cycleDays, setCycleDays] = useState(90);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paoMonths, setPaoMonths] = useState(6);
  const [expiryDate, setExpiryDate] = useState('');
  const [warrantyDate, setWarrantyDate] = useState('');
  const [backupStock, setBackupStock] = useState(1);
  const [minStockAlert, setMinStockAlert] = useState(1);
  const [price, setPrice] = useState<number | ''>('');
  const [specModel, setSpecModel] = useState('');
  const [location, setLocation] = useState('');
  const [isStored, setIsStored] = useState(false);
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setCategory(itemToEdit.category);
      setTrackingMode(itemToEdit.trackingMode);
      setCycleDays(itemToEdit.cycleDays || 90);
      setStartDate(itemToEdit.startDate);
      setPaoMonths(itemToEdit.paoMonths || 6);
      setExpiryDate(itemToEdit.expiryDate || '');
      setWarrantyDate(itemToEdit.warrantyDate || '');
      setBackupStock(itemToEdit.backupStock);
      setMinStockAlert(itemToEdit.minStockAlert);
      setPrice(itemToEdit.price !== null && itemToEdit.price !== undefined ? itemToEdit.price : '');
      setSpecModel(itemToEdit.specModel || '');
      setLocation(itemToEdit.location || '');
      setIsStored(Boolean(itemToEdit.isStored));
      setNotes(itemToEdit.notes || '');
      setImageUrl(itemToEdit.imageUrl || '');
      setSelectedStockId(itemToEdit.stockId || (stocks[0]?.id ?? ''));
    } else {
      // Reset form
      setName('');
      setCategory('bathroom');
      setTrackingMode('cycle');
      setCycleDays(90);
      setStartDate(new Date().toISOString().split('T')[0]);
      setPaoMonths(6);
      setExpiryDate('');
      setWarrantyDate('');
      setBackupStock(1);
      setMinStockAlert(1);
      setPrice('');
      setSpecModel('');
      setLocation('');
      setIsStored(false);
      setNotes('');
      setImageUrl('');
      if (currentStockId && currentStockId !== 'all') {
        setSelectedStockId(currentStockId);
      } else if (stocks.length > 0) {
        setSelectedStockId(stocks[0].id);
      } else {
        setSelectedStockId('');
      }
    }
    setErrorMessage('');
  }, [itemToEdit, isOpen, currentStockId, stocks]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ItemPreset) => {
    setName(preset.name);
    setCategory(preset.category);
    setTrackingMode(preset.trackingMode);
    if (preset.cycleDays) setCycleDays(preset.cycleDays);
    if (preset.paoMonths) setPaoMonths(preset.paoMonths);
    if (preset.minStockAlert !== undefined) setMinStockAlert(preset.minStockAlert);
    if (preset.defaultPrice !== undefined) setPrice(preset.defaultPrice);
    if (preset.defaultSpecModel !== undefined) setSpecModel(preset.defaultSpecModel);
    if (preset.notes) setNotes(preset.notes);
    setImageUrl(preset.imageUrl || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('請填寫物品名稱');
      return;
    }

    setSaving(true);
    setErrorMessage('');
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
            startDate,
            paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
            expiryDate: trackingMode === 'expiry' ? expiryDate : null,
            warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
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
              startDate,
              trackingMode,
              cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null,
              paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
              expiryDate: trackingMode === 'expiry' ? expiryDate : null,
              warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
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
            startDate,
            paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
            expiryDate: trackingMode === 'expiry' ? expiryDate : null,
            warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
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
              startDate,
              trackingMode,
              cycleDays: trackingMode === 'cycle' ? Number(cycleDays) : null,
              paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null,
              expiryDate: trackingMode === 'expiry' ? expiryDate : null,
              warrantyDate: trackingMode === 'warranty' ? warrantyDate : null,
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
          startDate,
          paoMonths: trackingMode === 'pao' ? Number(paoMonths) : null as any,
          expiryDate: trackingMode === 'expiry' ? expiryDate : null as any,
          warrantyDate: trackingMode === 'warranty' ? warrantyDate : null as any,
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
          startDate,
          paoMonths: trackingMode === 'pao' ? Number(paoMonths) : undefined,
          expiryDate: trackingMode === 'expiry' ? expiryDate : undefined,
          warrantyDate: trackingMode === 'warranty' ? warrantyDate : undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="app-surface border border-[var(--app-border)] rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--app-border)]">
          <h2 className="text-base font-bold text-[var(--app-text)] tracking-tight">
            {itemToEdit ? '編輯物品' : '新增追蹤物品'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--app-muted)] hover:text-[var(--app-text)] p-1.5 rounded-lg hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Preset quick pills (Only when creating new item) */}
          {!itemToEdit && (
            <div>
              <span className="text-xs font-semibold text-[var(--app-accent-strong)] flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> 常用耗材範本（點擊快速帶入）
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {ITEM_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="flex-shrink-0 bg-[var(--app-surface-subtle)] hover:bg-[var(--app-control-hover)] border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] text-xs px-2.5 py-1 rounded-full transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">物品名稱 *</label>
            <input
              type="text"
              required
              placeholder="例如：電動牙刷刷頭、Brita 濾芯、防曬乳"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 py-2.5 text-[var(--app-text)] outline-none text-sm placeholder:text-[var(--app-muted-low)]"
            />
          </div>

          {/* Stock Space Selector */}
          {user && stocks.length > 0 && !itemToEdit && (
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">所屬備品庫 (Stock)</label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full bg-[var(--app-surface-subtle)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 py-2.5 text-[var(--app-text)] outline-none text-xs"
              >
                {stocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name} ({s.myRole === 'owner' ? '擁有者' : s.myRole === 'admin' ? '管理員' : '成員'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Photo & Image Upload/Camera Section */}
          <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--app-text)] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />
                <span>物品實體照片 / 插圖</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-rose-500 hover:text-rose-400 font-semibold transition-colors"
                >
                  移除照片
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Preview Thumbnail */}
              <div className="w-16 h-16 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-[var(--app-muted)] flex flex-col items-center">
                    <Camera className="w-5 h-5 mb-0.5 text-[var(--app-muted-low)]" />
                    <span className="text-[11px] font-medium">未設定</span>
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
                  className="app-control flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold text-[var(--app-text)] hover:border-[var(--app-accent)] active:scale-95 transition-all border border-[var(--app-border)]"
                >
                  <Camera className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />
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
                  className="app-control flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold text-[var(--app-text)] hover:border-[var(--app-accent)] active:scale-95 transition-all border border-[var(--app-border)]"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />
                  <span>相簿選圖</span>
                </button>
              </div>
            </div>
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold text-[var(--app-text)] mb-1.5">類別</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`text-xs py-2 px-1 rounded-xl border text-center font-medium transition-all ${
                    category === cat.id
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/15 text-[var(--app-accent-strong)] font-semibold'
                      : 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Mode */}
          <div>
            <label className="block text-xs font-semibold text-[var(--app-text)] mb-1.5">追蹤模式</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'cycle', label: '週期更換 (天數)' },
                { id: 'pao', label: '開封期 (PAO)' },
                { id: 'expiry', label: '有效期限' },
                { id: 'warranty', label: '保固倒數' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTrackingMode(m.id as TrackingMode)}
                  className={`text-xs py-2 px-2 rounded-xl border text-center font-medium transition-all ${
                    trackingMode === m.id
                      ? 'app-primary-soft font-semibold'
                      : 'bg-[var(--app-surface-subtle)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
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
                <label className="block text-xs font-medium text-[var(--app-text)] mb-1">更換週期 (天數)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={cycleDays}
                    onChange={(e) => setCycleDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-[var(--app-text)] outline-none font-bold text-sm"
                  />
                  <div className="flex gap-1">
                    {[30, 90, 180, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCycleDays(d)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${
                          cycleDays === d ? 'app-primary-soft' : 'app-control'
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
                <label className="block text-xs font-medium text-[var(--app-text)] mb-1">開封後使用壽命 (PAO 月數)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={paoMonths}
                    onChange={(e) => setPaoMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-[var(--app-text)] outline-none font-bold text-sm"
                  />
                  <div className="flex gap-1">
                    {[1, 3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaoMonths(m)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${
                          paoMonths === m ? 'app-primary-soft' : 'app-control'
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
                <label className="block text-xs font-medium text-[var(--app-text)] mb-1">有效期限日期</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-[var(--app-text)] outline-none text-xs"
                />
              </div>
            )}

            {trackingMode === 'warranty' && (
              <div>
                <label className="block text-xs font-medium text-[var(--app-text)] mb-1">保固到期日期</label>
                <input
                  type="date"
                  required
                  value={warrantyDate}
                  onChange={(e) => setWarrantyDate(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-[var(--app-text)] outline-none text-xs"
                />
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-[var(--app-text)] mb-1">
                {trackingMode === 'pao' ? '開封日期' : trackingMode === 'warranty' ? '購買日期' : '本次啟用 / 更換日期'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2 text-[var(--app-text)] outline-none text-xs"
              />
            </div>
          </div>

          {/* Backup Stock Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">現有備品數量</label>
              <input
                type="number"
                min="0"
                value={backupStock}
                onChange={(e) => setBackupStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] outline-none font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">補貨警示門檻 (低於)</label>
              <input
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] outline-none text-sm"
              />
            </div>
          </div>

          {/* Price & Spec Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">購買金額 (NT$)</label>
              <input
                type="number"
                min="0"
                placeholder="例如：450"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] outline-none font-medium placeholder:text-[var(--app-muted-low)] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">規格 / 型號</label>
              <input
                type="text"
                placeholder="例如：3號(AA) / 003黑色"
                value={specModel}
                onChange={(e) => setSpecModel(e.target.value)}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3 py-2.5 text-[var(--app-text)] outline-none font-medium placeholder:text-[var(--app-muted-low)] text-xs"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--app-text)]">存放位置 (選填)</label>
              <span className="text-xs text-[var(--app-muted)]">方便找備品與打掃</span>
            </div>
            <input
              type="text"
              placeholder="例如：主臥衛浴、廚房水槽下、陽台、儲藏室..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] focus:border-[var(--app-accent)] rounded-xl px-3.5 py-2 text-[var(--app-text)] outline-none text-xs placeholder:text-[var(--app-muted-low)]"
            />
            <div className="flex gap-1.5 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {['衛浴', '廚房', '臥室', '客廳', '陽台', '儲藏室', '隨身包', '辦公室'].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                    location === loc
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/15 text-[var(--app-accent-strong)] font-semibold'
                      : 'border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Stored / Inactive Mode Toggle */}
          <div className="bg-[var(--app-surface-subtle)] border border-[var(--app-border)] p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 pr-2">
              <label className="text-xs font-bold text-[var(--app-text)] flex items-center gap-1.5 cursor-pointer">
                <Package className="w-3.5 h-3.5 text-[var(--app-accent-strong)]" />
                <span>先存放，還沒有要開始使用</span>
              </label>
              <p className="text-xs text-[var(--app-muted)] mt-0.5 leading-relaxed">
                囤貨備品專用。開啟後暫不啟動倒數，日後在物品卡片點擊「開始使用」才開始計時。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsStored(!isStored)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                isStored ? 'bg-[var(--app-accent-strong)]' : 'bg-[var(--app-border)]'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  isStored ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--app-text)] mb-1">備註說明 (選填)</label>
            <input
              type="text"
              placeholder="例如：型號 P-3101、第二道活性碳"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl px-3.5 py-2 text-[var(--app-text)] outline-none text-xs placeholder:text-[var(--app-muted-low)]"
            />
          </div>

          {errorMessage && (
            <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="app-primary w-full flex items-center justify-center gap-2 hover:brightness-105 font-bold py-3 rounded-xl text-sm shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{itemToEdit ? '儲存變更' : '建立物品'}</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
