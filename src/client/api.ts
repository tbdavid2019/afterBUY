import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { UserSession, ItemResponse, ItemHistoryRecord, UserNotificationSettings, ItemCategory, TrackingMode } from '../shared/types.ts';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '請求失敗');
  }
  return data;
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
  async getItems(): Promise<{ items: ItemResponse[] }> {
    return request('/items');
  },

  async createItem(item: {
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

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '圖片上傳失敗');
    }
    return data;
  },
};
