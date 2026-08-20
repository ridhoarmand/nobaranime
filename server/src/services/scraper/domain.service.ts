import { sendTelegramAlert } from '../../lib/helpers.js';

let activeBaseUrl = process.env.BASE_URL || 'https://otakudesu.blog';

export const getBaseUrl = () => activeBaseUrl;

export const setBaseUrl = (url: string) => {
  activeBaseUrl = url.replace(/\/$/, '');
};

export const normalizeThumbUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const currentBase = getBaseUrl();
  // Replace old otakudesu domains with current active domain
  return url.replace(/^https?:\/\/otakudesu\.[a-z0-9]+/i, currentBase);
};

export const checkDomainStatus = async (): Promise<boolean> => {
  const baseUrl = getBaseUrl();
  try {
    const response = await fetch(baseUrl, { redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      const newLocation = response.headers.get('location');
      if (newLocation && !newLocation.includes(baseUrl)) {
        const alertMsg = `🚨 <b>Domain Berubah!</b>\nOtakudesu dialihkan ke domain baru.\nSaat ini: <code>${baseUrl}</code>\nBaru: <code>${newLocation}</code>\nHarap perbarui BASE_URL di file .env!`;
        console.log(`\n[CRITICAL] Domain telah berubah! Diarahkan ke: ${newLocation}`);
        await sendTelegramAlert(alertMsg);
        return false;
      }
    }
    return true;
  } catch (e: any) {
    console.error(`[CRITICAL] Tidak dapat menjangkau ${baseUrl}. Mungkin domain diblokir atau sedang down?`, e.message);
    const alertMsg = `🚨 <b>Domain Tidak Bisa Diakses!</b>\nTidak dapat menjangkau <code>${baseUrl}</code>.\nError: ${e.message}\nPeriksa apakah domain telah berubah atau sedang down.`;
    await sendTelegramAlert(alertMsg);
    return false;
  }
};
