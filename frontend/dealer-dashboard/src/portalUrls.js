const isDevelopment = process.env.NODE_ENV !== 'production';

export const PORTAL_URLS = {
  gov: isDevelopment ? 'http://localhost:5173' : 'https://kisan-setu-1eok.vercel.app',
  dealer: isDevelopment ? 'http://localhost:5174' : 'https://kisan-setu-ivij.vercel.app',
};
