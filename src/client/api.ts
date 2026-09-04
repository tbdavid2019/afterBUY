import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {
  UserSession,
  ItemResponse,
  ItemHistoryRecord,
  UserNotificationSettings,
  ItemCategory,
  TrackingMode,
  StockResponse,
  StockMemberResponse,
  StockInviteResponse,
  StockRole,
} from '../shared/types.ts';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
  } catch (err: any) {
    console.error(`Network fetch error on ${path}:`, err);
    throw new Error(err.message === 'Failed to fetch' ? '網路連線異常，請檢查網路狀態或重新整理' : (err.message || '連線失敗'));
  }

  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(data.error || `請求失敗 (HTTP ${res.status})`);
  }
  return data as T;
}

export const api = {
  // --- Auth API ---
  async getMe(): Promise<{ user: UserSession | null; devices?: Array<{ id: string; deviceName: string; createdAt: string; lastUsedAt: string | null }> }> {
    return request('/auth/me');
  },

  async sendOtp(email: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    return request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, code: string): Promise<{ success: boolean; user: UserSession }> {
    return request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async loginWithPasskey(): Promise<{ success: boolean; user: UserSession }> {
    const { options, challengeId } = await request<{ options: any; challengeId: string }>('/auth/passkey/auth-options', {
      method: 'POST',
    });

    const assertionResponse = await startAuthentication({ optionsJSON: options });
    return request('/auth/passkey/auth-verify', {
      method: 'POST',
      body: JSON.stringify({ response: assertionResponse, challengeId }),
    });
  },

  async registerPasskey(deviceName?: string): Promise<{ success: boolean; message: string }> {
    const options = await request<any>('/auth/passkey/register-options');
    const registrationResponse = await startRegistration({ optionsJSON: options });
    return request('/auth/passkey/register-verify', {
      method: 'POST',
      body: JSON.stringify({ response: registrationResponse, deviceName }),
    });
  },

  async deletePasskey(id: string): Promise<{ success: boolean }> {
    return request(`/auth/passkey/${id}`, { method: 'DELETE' });
  },

  async logout(): Promise<{ success: boolean }> {
    return request('/auth/logout', { method: 'POST' });
  },

  // --- Items API ---
  async getItems(stockId?: string): Promise<{ items: ItemResponse[] }> {
    const query = stockId && stockId !== 'all' ? `?stockId=${encodeURIComponent(stockId)}` : '';
    return request(`/items${query}`);
  },

  async createItem(item: {
    stockId?: string;
    name: string;
    category?: ItemCategory;
    trackingMode?: TrackingMode;
    cycleDays?: number;
    startDate?: string;
    paoMonths?: number;
    expiryDate?: string;
    warrantyDate?: string;
    backupStock?: number;
    minStockAlert?: number;
    price?: number | null;
    specModel?: string | null;
    location?: string | null;
    isStored?: boolean;
    snoozeUntil?: string | null;
    notes?: string;
    imageUrl?: string;
  }): Promise<{ success: boolean; item: any }> {
    return request('/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateItem(id: string, updates: Partial<{
    name: string;
    category: ItemCategory;
    trackingMode: TrackingMode;
    cycleDays: number;
    startDate: string;
    paoMonths: number;
    expiryDate: string;
    warrantyDate: string;
    backupStock: number;
    minStockAlert: number;
    price: number | null;
    specModel: string | null;
    location: string | null;
    isStored: boolean;
    snoozeUntil: string | null;
    notes: string;
    imageUrl: string;
  }>): Promise<{ success: boolean; item: any }> {
    return request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteItem(id: string): Promise<{ success: boolean }> {
    return request(`/items/${id}`, { method: 'DELETE' });
  },

  async markReplaced(id: string): Promise<{ success: boolean; newStock: number; startDate: string }> {
    return request(`/items/${id}/replace`, { method: 'POST' });
  },

  async startUsingItem(id: string): Promise<{ success: boolean; startDate: string; isStored: boolean }> {
    return request(`/items/${id}/start-using`, { method: 'POST' });
  },

  async snoozeItem(id: string, days = 7): Promise<{ success: boolean; snoozeUntil: string }> {
    return request(`/items/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },

  async batchReplace(itemIds: string[]): Promise<{ success: boolean; count: number; items: any[] }> {
    return request('/items/batch-replace', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
  },

  async batchStock(itemIds: string[], delta: number): Promise<{ success: boolean; count: number; items: any[] }> {
    return request('/items/batch-stock', {
      method: 'POST',
      body: JSON.stringify({ itemIds, delta }),
    });
  },

  async batchDelete(itemIds: string[]): Promise<{ success: boolean; count: number }> {
    return request('/items/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ itemIds }),
    });
  },

  async adjustStock(id: string, delta?: number, count?: number): Promise<{ success: boolean; backupStock: number }> {
    return request(`/items/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ delta, count }),
    });
  },

  async getItemHistory(id: string): Promise<{ history: ItemHistoryRecord[] }> {
    return request(`/items/${id}/history`);
  },

  // --- Calendar API ---
  getCalendarUrl(token: string): string {
    const origin = window.location.origin;
    return `${origin}/api/calendar/${token}.ics`;
  },

  getWebCalUrl(token: string): string {
    const origin = window.location.origin.replace(/^http/, 'webcal');
    return `${origin}/api/calendar/${token}.ics`;
  },

  async rotateCalendarToken(): Promise<{ success: boolean; calendarToken: string }> {
    return request('/calendar/rotate-token', { method: 'POST' });
  },

  // --- Notifications API ---
  async getSettings(): Promise<{ settings: UserNotificationSettings }> {
    return request('/notifications/settings');
  },

  async updateSettings(settings: Partial<UserNotificationSettings>): Promise<{ success: boolean }> {
    return request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getVapidKey(): Promise<{ publicKey: string }> {
    return request('/notifications/vapid-key');
  },

  async subscribePush(subscription: PushSubscription): Promise<{ success: boolean }> {
    const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
    const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

    const p256dh = rawKey ? btoa(String.fromCharCode(...new Uint8Array(rawKey))) : '';
    const auth = rawAuth ? btoa(String.fromCharCode(...new Uint8Array(rawAuth))) : '';

    return request('/notifications/push-subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: { p256dh, auth },
      }),
    });
  },

  // --- Upload API ---
  async uploadImage(file: File): Promise<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
    } catch (err: any) {
      console.error('Upload network error:', err);
      throw new Error(err.message === 'Failed to fetch' ? '圖片上傳連線失敗，請檢查網路狀態' : (err.message || '上傳失敗'));
    }

    let data: any;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `HTTP ${res.status}` };
    }

    if (!res.ok) {
      throw new Error(data.error || '圖片上傳失敗');
    }
    return data;
  },

  async uploadBatchImages(files: File[]): Promise<{ success: boolean; count: number; urls: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/upload/batch`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
    } catch (err: any) {
      console.error('Batch upload network error:', err);
      throw new Error(err.message === 'Failed to fetch' ? '批次圖片上傳連線失敗，請檢查網路狀態' : (err.message || '上傳失敗'));
    }

    let data: any;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `HTTP ${res.status}` };
    }

    if (!res.ok) {
      throw new Error(data.error || '批次圖片上傳失敗');
    }
    return data;
  },

  // --- Stocks API ---
  async getStocks(): Promise<{ stocks: StockResponse[] }> {
    return request('/stocks');
  },

  async getStock(id: string): Promise<{ stock: StockResponse; members: StockMemberResponse[]; invites: StockInviteResponse[] }> {
    return request(`/stocks/${id}`);
  },

  async createStock(data: { name: string; description?: string; icon?: string }): Promise<{ success: boolean; stock: StockResponse }> {
    return request('/stocks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStock(id: string, data: { name?: string; description?: string; icon?: string }): Promise<{ success: boolean; stock: StockResponse }> {
    return request(`/stocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStock(id: string): Promise<{ success: boolean }> {
    return request(`/stocks/${id}`, { method: 'DELETE' });
  },

  async leaveStock(id: string): Promise<{ success: boolean }> {
    return request(`/stocks/${id}/leave`, { method: 'POST' });
  },

  async transferOwnership(stockId: string, targetUserId: string): Promise<{ success: boolean; message: string }> {
    return request(`/stocks/${stockId}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async createInvite(stockId: string, options?: { role?: StockRole; maxUses?: number; expiresInDays?: number }): Promise<{ success: boolean; invite: StockInviteResponse }> {
    return request(`/stocks/${stockId}/invites`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  async joinStock(code: string): Promise<{ success: boolean; stock: StockResponse }> {
    return request('/stocks/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async updateMemberRole(stockId: string, memberUserId: string, role: StockRole): Promise<{ success: boolean }> {
    return request(`/stocks/${stockId}/members/${memberUserId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async removeMember(stockId: string, memberUserId: string): Promise<{ success: boolean }> {
    return request(`/stocks/${stockId}/members/${memberUserId}`, {
      method: 'DELETE',
    });
  },
};

