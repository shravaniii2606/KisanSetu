const isDevelopment = process.env.NODE_ENV !== 'production';

export const PORTAL_URLS = {
  gov:
    isDevelopment
      ? 'http://localhost:5173'
      : 'https://gov.KisanSetu.com',
  dealer:
    isDevelopment
      ? 'http://localhost:5174'
      : 'https://dealer.KisanSetu.com',
};
