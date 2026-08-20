process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import ky from 'ky';

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const getRandomDelay = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const fetchService = async (url: string, options: any = {}) => {
  const fetchOptions = typeof options === 'number' ? {} : options;
  // Default to 3 retries (4 attempts) if undefined. If 0 is passed, it means 0 retries (1 attempt).
  // We use 'maxRetries' as 'maxAttempts' internally in the loop? No, existing logic uses it as attempts.
  // if maxRetries=3, runs 3 times.
  // If options.maxRetries is defined, use it. If it is 0, we want 1 attempt?
  // Actually, let's strictly use input as 'maxRetries' (retries).
  // So attempts = maxRetries + 1.

  let val = 3;
  if (typeof options === 'number') val = options;
  else if (options && typeof options.maxRetries === 'number') val = options.maxRetries;

  const maxAttempts = val + 1;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      // Add random delay between requests
      const delay = typeof fetchOptions.delay === 'number' ? fetchOptions.delay : getRandomDelay(2000, 5000);
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

      // Extract ky specific options
      const { maxRetries: _, ...kyBaseOptions } = fetchOptions;

      // Extract headers from fetchOptions to merge them, avoid overwriting defaults
      const { headers: customHeaders = {}, ...otherOptions } = fetchOptions;

      const kyOptions = {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          DNT: '1',
          ...customHeaders,
        },
        timeout: 15000,
        retry: 0, // Handle retries manually
        ...otherOptions,
      };

      // Remove method from kyOptions as it's handled by calling ky[method] or ky(url, { method })
      // ky supports ky(url, options) where options has method.
      const response = await ky(url, kyOptions);

      if (response.ok) {
        const text = await response.text();
        const isCloudflare = text.includes('One moment, please') || text.includes('Just a moment...') || text.includes('Attention Required!');
        if (isCloudflare) {
          throw new Error('Cloudflare DDoS protection challenge page detected');
        }

        return {
          status: 200,
          data: text, // Return raw HTML text
          headers: response.headers,
          isLastPage: false, // Logic to check last page needs to be handled by caller or parsed here if needed, but for now aligned with previous interface
        };
      }

      throw new Error(`Status ${response.status}`);
    } catch (error: any) {
      attempt++;
      if (!fetchOptions.silent) {
        console.log(`Attempt ${attempt} failed:`, error.message);
      }

      if (attempt < maxAttempts) {
        // Only wait if we are going to try again
        // Use backoff or custom delay? Original logic used backoff for errors.
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        // If custom delay is 0 (fail fast), we might still want backoff for failures?
        // But user wants fail fast.
        // If fetchOptions.delay === 0, then we should probably respect it?
        // But delay logic at start of loop handles "between requests".
        // This is "after failure" backoff.
        // If maxAttempts is small, backoff matters less.
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else {
        return {
          status: false,
          code: error.code || 500,
          message: error.message || 'Failed to fetch data after multiple attempts',
        };
      }
    }
  }
  return {
    status: false,
    code: 500,
    message: 'Failed to fetch data after multiple attempts',
  };
};
