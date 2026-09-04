import React, { useState, useRef } from 'react';
import { X, Camera, ImagePlus, Trash2, Check, Loader2, Package, Sparkles } from 'lucide-react';
import { api } from '../api.ts';
import { useTranslation } from '../i18n/index.tsx';
import { ItemCategory, TrackingMode, UserSession, ItemResponse } from '../../shared/types.ts';
import { CATEGORIES, ITEM_PRESETS, ItemPreset } from '../utils/category.ts';
import { computeItemStatus } from '../../shared/lifecycle.ts';

interface DraftItem {
  id: string;
  name: string;
  category: ItemCategory;
  trackingMode: TrackingMode;
  cycleDays: number;
  price: number | '';
  specModel: string;
  imageUrl: string;
}

interface BatchPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: UserSession | null;
  onAddGuestItems?: (items: ItemResponse[]) => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const BatchPhotoModal: React.FC<BatchPhotoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  onAddGuestItems,
}) => {
  const { t, locale } = useTranslation();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setUploading(true);
    setErrorMessage('');
    try {
      let urls: string[] = [];
      if (user) {
        const res = await api.uploadBatchImages(fileArray);
        urls = res.urls;
      } else {
        // Guest mode: instant local base64 preview without auth requirements
        urls = await Promise.all(fileArray.map(readFileAsDataUrl));
      }

      const newDrafts: DraftItem[] = urls.map((url, idx) => ({
        id: crypto.randomUUID(),
        name: `${locale === 'zh-TW' ? '新拍照物品' : 'New Item'} ${drafts.length + idx + 1}`,
        category: 'clothing',
        trackingMode: 'cycle',
        cycleDays: 90,
        price: '',
        specModel: '',
        imageUrl: url,
      }));
      setDrafts((prev) => [...prev, ...newDrafts]);
    } catch (err: any) {
      setErrorMessage(err.message || (locale === 'zh-TW' ? '照片上傳失敗' : 'Photo upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateDraft = (id: string, field: keyof DraftItem, val: any) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: val } : d))
    );
  };

  const handleApplyPresetToDraft = (draftId: string, preset: ItemPreset) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== draftId) return d;
        return {
          ...d,
          name: preset.name,
          category: preset.category,
          cycleDays: preset.cycleDays || (preset.paoMonths ? preset.paoMonths * 30 : 90),
          trackingMode: preset.trackingMode,
          price: preset.defaultPrice !== undefined ? preset.defaultPrice : d.price,
          specModel: preset.defaultSpecModel || d.specModel,
        };
      })
    );
  };

  const handleSaveAll = async () => {
    if (drafts.length === 0) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!user) {
        // Guest mode: save into local items state
        const createdGuestItems: ItemResponse[] = drafts.map((draft) => ({
          id: `guest-${crypto.randomUUID()}`,
          userId: 'guest',
          name: draft.name.trim() || (locale === 'zh-TW' ? '未命名物品' : 'Untitled Item'),
          category: draft.category,
          trackingMode: draft.trackingMode,
          cycleDays: draft.cycleDays,
          startDate: todayStr,
          paoMonths: null,
          expiryDate: null,
          warrantyDate: null,
          backupStock: 1,
          minStockAlert: 1,
          price: draft.price === '' ? null : Number(draft.price),
          specModel: draft.specModel.trim() || null,
          location: null,
          isStored: false,
          snoozeUntil: null,
          imageUrl: draft.imageUrl,
          notes: null,
          calendarSequence: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...computeItemStatus({
            startDate: todayStr,
            trackingMode: draft.trackingMode,
            cycleDays: draft.cycleDays,
            backupStock: 1,
          }),
        }));
        onAddGuestItems?.(createdGuestItems);
      } else {
        await Promise.all(
          drafts.map((draft) =>
            api.createItem({
              name: draft.name.trim() || (locale === 'zh-TW' ? '未命名物品' : 'Untitled Item'),
              category: draft.category,
              trackingMode: draft.trackingMode,
              cycleDays: draft.cycleDays,
              startDate: todayStr,
              backupStock: 1,
              minStockAlert: 1,
              price: draft.price === '' ? null : Number(draft.price),
              specModel: draft.specModel.trim() || null,
              imageUrl: draft.imageUrl,
            })
          )
        );
      }
      onSuccess();
      onClose();
      setDrafts([]);
    } catch (err: any) {
      setErrorMessage(err.message || (locale === 'zh-TW' ? '儲存失敗' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="app-surface w-full max-w-xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="app-primary-soft w-9 h-9 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('batchPhotoUpload')}</h2>
              <p className="text-[11px] text-slate-400">{t('batchPhotoDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Hidden inputs for camera & gallery */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            type="file"
            ref={galleryInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Action triggers: Big cards when 0 drafts, compact banner when > 0 drafts */}
          {drafts.length === 0 ? (
            <div className="space-y-3">
              <div className="text-center py-2">
                <p className="text-xs font-semibold text-sky-400">
                  {locale === 'zh-TW' ? '步驟 1：拍下您的耗材與物品實體' : 'Step 1: Snap photos of your items'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {locale === 'zh-TW' ? '支援連續拍攝多張，拍完後可一鍵套用範本建立' : 'Take multiple photos, then apply presets with 1 click'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className="app-surface-subtle flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-sky-500/40 hover:border-sky-400 hover:bg-sky-500/5 transition-all text-center group active:scale-[0.98]"
                >
                  <Camera className="w-8 h-8 text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">
                    {locale === 'zh-TW' ? '拍照連續上傳' : 'Capture with Camera'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {locale === 'zh-TW' ? '啟動手機鏡頭連續拍' : 'Camera snapshot'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="app-surface-subtle flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-500/5 transition-all text-center group active:scale-[0.98]"
                >
                  <ImagePlus className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">
                    {locale === 'zh-TW' ? '相簿選取多張' : 'Select from Photos'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {locale === 'zh-TW' ? '一次多選批次匯入' : 'Batch gallery picker'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed Action Banner */
            <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-xs border border-sky-500/30">
                  {drafts.length}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {locale === 'zh-TW' ? `已擷取 ${drafts.length} 張照片` : `${drafts.length} photos ready`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {locale === 'zh-TW' ? '點擊下方範本標籤可秒填資料' : 'Tap preset tags to auto-fill'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className="app-control flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-300 hover:text-white active:scale-95 transition-all"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>加拍</span>
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="app-control flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white active:scale-95 transition-all"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>加選</span>
                </button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="flex items-center justify-center gap-2 p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-xs text-sky-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{locale === 'zh-TW' ? '照片讀取處理中...' : 'Processing photos...'}</span>
            </div>
          )}

          {errorMessage && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              {errorMessage}
            </div>
          )}

          {/* Draft list */}
          {drafts.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{locale === 'zh-TW' ? '步驟 2：確認各項物品名稱與週期' : 'Step 2: Review details & cycle'}</span>
                <span className="text-[11px] text-sky-400 font-medium">
                  {locale === 'zh-TW' ? '點擊標籤秒套用' : 'Tap pills to fill'}
                </span>
              </div>

              <div className="space-y-3">
                {drafts.map((draft, idx) => (
                  <div
                    key={draft.id}
                    className="app-surface-subtle border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-2.5 relative group shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* Photo Thumbnail */}
                      <div className="w-20 h-20 rounded-xl border border-slate-700 shrink-0 bg-slate-900 overflow-hidden shadow-inner relative">
                        <img
                          src={draft.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-slate-950/80 text-[9px] font-bold text-slate-300 px-1 rounded">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Main info inputs */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => handleUpdateDraft(draft.id, 'name', e.target.value)}
                          placeholder={t('itemName')}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs outline-none"
                        />

                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <select
                            value={draft.category}
                            onChange={(e) => handleUpdateDraft(draft.id, 'category', e.target.value as ItemCategory)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs outline-none"
                          >
                            {Object.values(CATEGORIES).map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs">
                            <input
                              type="number"
                              value={draft.cycleDays}
                              onChange={(e) => handleUpdateDraft(draft.id, 'cycleDays', parseInt(e.target.value) || 90)}
                              placeholder="週期天數"
                              className="w-full bg-transparent text-white font-semibold outline-none text-xs"
                            />
                            <span className="text-[10px] text-slate-400 shrink-0">天</span>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveDraft(draft.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Match Preset Pills */}
                    <div className="pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium mr-0.5">常用範本:</span>
                        {ITEM_PRESETS.slice(0, 8).map((p, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleApplyPresetToDraft(draft.id, p)}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 hover:border-sky-400 bg-slate-800/80 hover:bg-sky-500/10 text-slate-300 hover:text-white shrink-0 active:scale-95 transition-all"
                          >
                            {p.name.replace(/更換|換新|開封保存/g, '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Secondary fields: Price & Spec Model */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                      <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-slate-500 mr-1">NT$</span>
                        <input
                          type="number"
                          value={draft.price}
                          onChange={(e) => handleUpdateDraft(draft.id, 'price', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                          placeholder="購買金額 (選填)"
                          className="w-full bg-transparent text-white outline-none text-[11px]"
                        />
                      </div>
                      <input
                        type="text"
                        value={draft.specModel}
                        onChange={(e) => handleUpdateDraft(draft.id, 'specModel', e.target.value)}
                        placeholder="規格型號 (選填)"
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2 py-1 text-white outline-none text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {drafts.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80 backdrop-blur-md">
            <span className="text-xs text-slate-400">
              {locale === 'zh-TW' ? `共 ${drafts.length} 項物品準備就緒` : `${drafts.length} items ready`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDrafts([])}
                className="app-control px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAll}
                className="app-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/25 active:scale-95 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{locale === 'zh-TW' ? `確認建立 (${drafts.length} 項)` : `Create All (${drafts.length})`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
