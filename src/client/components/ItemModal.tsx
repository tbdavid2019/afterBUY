import React, { useState, useEffect } from 'react';
import { X, Sparkles, Calendar, Package, AlertCircle, Camera, Loader2, Check } from 'lucide-react';
import { ItemResponse, ItemCategory, TrackingMode } from '../../shared/types.ts';
import { CATEGORIES, ITEM_PRESETS, ItemPreset } from '../utils/category.ts';
import { api } from '../api.ts';

interface ItemModalProps {
  isOpen: boolean;
  itemToEdit?: ItemResponse | null;
  onClose: () => void;
  onSave: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  itemToEdit,
  onClose,
  onSave,
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
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      setNotes(itemToEdit.notes || '');
      setImageUrl(itemToEdit.imageUrl || '');
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
      setNotes('');
      setImageUrl('');
    }
    setErrorMessage('');
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ItemPreset) => {
    setName(preset.name);
    setCategory(preset.category);
    setTrackingMode(preset.trackingMode);
    if (preset.cycleDays) setCycleDays(preset.cycleDays);
    if (preset.paoMonths) setPaoMonths(preset.paoMonths);
    if (preset.minStockAlert !== undefined) setMinStockAlert(preset.minStockAlert);
    if (preset.notes) setNotes(preset.notes);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage('');
    try {
      const res = await api.uploadImage(file);
      setImageUrl(res.url);
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
          notes: notes.trim() || null as any,
          imageUrl: imageUrl || null as any,
        });
      } else {
        await api.createItem({
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="app-surface border rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">
            {itemToEdit ? '編輯物品' : '新增追蹤物品'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Preset quick pills (Only when creating new item) */}
          {!itemToEdit && (
            <div>
              <span className="text-xs font-semibold text-sky-400 flex items-center gap-1 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> 常用耗材範本（點擊快速帶入）
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {ITEM_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="flex-shrink-0 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 border border-slate-700/60 text-slate-300 hover:text-white text-xs px-2.5 py-1 rounded-full transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">物品名稱 *</label>
            <input
              type="text"
              required
              placeholder="例如：電動牙刷刷頭、Brita 濾芯、防曬乳"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">類別</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.values(CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`text-xs py-2 px-1 rounded-xl border text-center font-medium transition-all ${
                    category === cat.id
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tracking Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">追蹤模式</label>
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
                      ? 'app-primary-soft'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic mode inputs */}
          <div className="app-surface-subtle border p-3.5 rounded-2xl space-y-3">
            {trackingMode === 'cycle' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">更換週期 (天數)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={cycleDays}
                    onChange={(e) => setCycleDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                  <div className="flex gap-1">
                    {[30, 90, 180, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCycleDays(d)}
                        className={`text-[11px] px-2 py-1 rounded-lg border ${
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
                <label className="block text-xs font-medium text-slate-300 mb-1">開封後使用壽命 (PAO 月數)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={paoMonths}
                    onChange={(e) => setPaoMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                  <div className="flex gap-1">
                    {[1, 3, 6, 12, 24].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaoMonths(m)}
                        className={`text-[11px] px-2 py-1 rounded-lg border ${
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
                <label className="block text-xs font-medium text-slate-300 mb-1">有效期限日期</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            )}

            {trackingMode === 'warranty' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">保固到期日期</label>
                <input
                  type="date"
                  required
                  value={warrantyDate}
                  onChange={(e) => setWarrantyDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {trackingMode === 'pao' ? '開封日期' : trackingMode === 'warranty' ? '購買日期' : '本次啟用 / 更換日期'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          {/* Backup Stock Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">現有備品數量</label>
              <input
                type="number"
                min="0"
                value={backupStock}
                onChange={(e) => setBackupStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">補貨警示門檻 (低於)</label>
              <input
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">備註 / 規格型號 (選填)</label>
            <input
              type="text"
              placeholder="例如：型號 P-3101、第二道活性碳"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none"
            />
          </div>

          {errorMessage && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="app-primary w-full flex items-center justify-center gap-2 hover:brightness-105 font-bold py-3 rounded-xl shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{itemToEdit ? '儲存變更' : '建立物品'}</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
