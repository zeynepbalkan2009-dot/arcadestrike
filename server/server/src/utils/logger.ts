const isDev = process.env.NODE_ENV !== 'production';
export const logger = {
  info:  (msg: string, data?: any) => console.log(`[INFO]  ${msg}`, data ?? ''),
  warn:  (msg: string, data?: any) => console.warn(`[WARN]  ${msg}`, data ?? ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data ?? ''),
  debug: (msg: string, data?: any) => { if (isDev) console.log(`[DEBUG] ${msg}`, data ?? ''); },
};
