import ky from 'ky';

export const PER_PAGE = 25;

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const cleanEndpoint = (href: string | undefined): string => {
  if (!href) return '';
  // If it's a social share URL, extract the nested anime slug or return empty
  if (href.includes('sharer') || href.includes('facebook.com') || href.includes('twitter.com') || href.includes('whatsapp.com')) {
    const match = href.match(/\/anime\/([^\/\?#]+)/i);
    if (match) return match[1].replace(/\/$/, '').trim();
    return '';
  }

  const match = href.match(/\/(episode|anime|batch|lengkap)\/([^\/\?#]+)/i);
  if (match) return match[2].replace(/\/$/, '').trim();

  return href
    .replace(/^https?:\/\/[^\/]+\/(episode|anime|batch|lengkap)\//i, '')
    .replace(/\/$/, '')
    .trim();
};

export const processBatch = async (tasks: (() => Promise<any>)[], batchSize = 1, delayMs = 800) => {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await Promise.all(batch.map((fn) => fn()));
    if (i + batchSize < tasks.length) await delay(delayMs);
  }
};

export const getInsertStatus = (result: any) => {
  if (!result || !result[0]) return 'Unknown';
  const affected = result[0].affectedRows;
  if (affected === 1) return 'Inserted';
  if (affected === 2) return 'Updated';
  if (affected === 0) return 'No Change';
  return `Affected: ${affected}`;
};

export const cleanResolution = (rawText: string): string => {
  const t = rawText.toUpperCase();
  if (t.includes('1080')) return '1080p';
  if (t.includes('720')) return '720p';
  if (t.includes('480')) return '480p';
  if (t.includes('360')) return '360p';
  if (t.includes('240')) return '240p';
  return rawText.trim();
};

export const extractSize = (text: string): string | null => {
  if (!text) return null;
  const match = text.match(/(\d+(\.\d+)?\s*(MB|GB|KB))/i);
  return match ? match[0].trim() : null;
};

export const sendTelegramAlert = async (message: string) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await ky.post(url, {
      json: {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
      timeout: 5000,
    });
  } catch (e: any) {
    console.error('[Telegram] Failed to send alert:', e.message);
  }
};

export const paginate = (page: number, perPage = PER_PAGE) => ({
  limit: perPage,
  offset: (page - 1) * perPage,
});

export const jsonOk = (c: any, data: any, meta?: any) => c.json({ status: true, ...(meta || {}), data });

export const json404 = (c: any, message = 'Not found') => c.json({ status: false, message }, 404);
