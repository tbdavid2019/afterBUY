import { UserSession } from '../shared/types.ts';

export interface Bindings {
  DB?: D1Database;
  KV?: KVNamespace;
  R2?: R2Bucket;
  APP_NAME?: string;
  APP_ORIGIN?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
  SESSION_SECRET?: string;
  DATABASE_URL?: string;
}

export interface Variables {
  user?: UserSession;
}

export interface HonoEnv {
  Bindings: Bindings;
  Variables: Variables;
}
