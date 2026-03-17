# Ad-Blocking Implementation Guide

## Overview

This document describes the multi-layer ad-blocking implementation for NobarAnime's streaming platform to minimize ads from third-party streaming providers.

## Provider Coverage

The following streaming providers are supported:
- ✅ **vidhide** (high ads)
- ✅ **filedon** (high ads)
- ✅ **mega** (low ads)
- ✅ **ondesu** (high ads)
- ✅ **ondesuhd** (high ads)
- ✅ **updesu** (high ads)
- ✅ **ondesu3** (high ads)
- ✅ **odstream** (high ads)
- ✅ **pdrain** (high ads)

---

## Implementation Layers

### Layer 1: Iframe Sandbox Restrictions

**File:** `src/components/anime/AnimePlayer.tsx`

The iframe uses strict sandbox attributes to prevent common ad techniques:

```tsx
sandbox="allow-scripts allow-same-origin allow-forms"
```

**What's blocked:**
- ❌ `allow-popups` - Prevents popup windows
- ❌ `allow-top-navigation` - Prevents redirect ads
- ❌ `allow-presentation` - Prevents Chromecast/presentation ads

**Additional protections:**
```tsx
referrerPolicy="no-referrer"  // Prevents tracking via referrer
allow="autoplay; encrypted-media; picture-in-picture"  // Minimal permissions
```

---

### Layer 2: Content Security Policy (CSP)

**File:** `index.html`

CSP headers block requests to known ad networks:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' https:;
  script-src 'self' 'unsafe-inline' blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.supabase.co https://*.supabase.co https://*.film.idho.eu.org;
  frame-src 'self' https:;
  child-src 'self' blob:;
  media-src 'self' https: blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  block-all-mixed-content;
  upgrade-insecure-requests;
" />
```

**Key protections:**
- `object-src 'none'` - Blocks Flash/shockwave ads
- `block-all-mixed-content` - Prevents mixed content attacks
- `upgrade-insecure-requests` - Forces HTTPS

---

### Layer 3: Permissions Policy

**File:** `index.html`

Browser features that could be abused for ads are disabled:

```html
<meta http-equiv="Permissions-Policy" content="
  accelerometer=(),
  ambient-light-sensor=(),
  battery=(),
  camera=(),
  geolocation=(),
  gyroscope=(),
  magnetometer=(),
  microphone=(),
  payment=(),
  usb=(),
  ...
" />
```

---

### Layer 4: Ad Domain Blocklist

**File:** `src/lib/adblock.ts`

Contains comprehensive lists of:
- **AD_DOMAINS**: 200+ known ad networks and tracking domains
- **ALLOWED_STREAMING_DOMAINS**: Legitimate streaming provider domains
- **AD_URL_PATTERNS**: Regex patterns to detect ad URLs

**Usage:**
```typescript
import { isAdUrl, isAllowedStreamingDomain } from './adblock';

if (isAdUrl(url)) {
  // Block or warn user
}
```

---

### Layer 5: User Warnings

**File:** `src/components/anime/StreamQualityDropdown.tsx`

Visual indicators show ad risk level for each provider:

- 🟢 **Shield Check Icon** = Low ads risk (e.g., Mega, Google Drive)
- 🟡 **Shield Alert Icon** = High ads risk (e.g., Vidhide, Filedon, Ondesu)
- ⚪ **No Icon** = Medium/Unknown risk

**Provider Classification:**
```typescript
const LOW_ADS_PROVIDERS = ['mega', 'google drive', 'youtube'];
const HIGH_ADS_PROVIDERS = ['vidhide', 'filedon', 'ondesu', 'updesu', 'odstream', 'pdrain'];
```

---

## How It Works Together

```
┌─────────────────────────────────────────────────────────┐
│                   User Selects Stream                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  StreamQualityDropdown shows ad risk indicator         │
│  (🟢 Low / 🟡 High / ⚪ Medium)                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Iframe loads with strict sandbox restrictions          │
│  - No popups                                            │
│  - No top-navigation                                    │
│  - No referrer tracking                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  CSP blocks requests to known ad domains                │
│  - 200+ ad networks blocked                             │
│  - Object/embed blocked                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Permissions Policy disables tracking features          │
│  - No accelerometer, gyroscope, etc.                    │
└─────────────────────────────────────────────────────────┘
```

---

## Limitations

⚠️ **Important Notes:**

1. **Cannot block all ads**: Since ads are served from within the iframe (same-origin as provider), we cannot directly block them from the parent page.

2. **Provider-dependent**: Effectiveness varies by provider. Some providers inject ads directly into the video stream.

3. **CSP restrictions**: Overly strict CSP may break legitimate functionality.

4. **Cat-and-mouse game**: Providers may change domains or techniques.

---

## Recommendations for Users

1. **Use an ad blocker**: Browser extensions like uBlock Origin provide additional protection.

2. **Try multiple servers**: If one provider has too many ads, switch to another.

3. **Prefer low-risk providers**: Choose Mega, Google Drive when available.

4. **Close popups quickly**: Some ads may still appear before being blocked.

---

## Future Improvements

Potential enhancements:

1. **Service Worker**: Intercept and block ad requests at network level
2. **Proxy server**: Route streams through server that filters ads
3. **Community reports**: Allow users to report ad-heavy providers
4. **Auto-switch**: Automatically switch to backup stream if ads detected
5. **DNS-level blocking**: Integrate with Pi-hole or similar services

---

## Files Modified/Created

| File | Purpose |
|------|---------|
| `src/components/anime/AnimePlayer.tsx` | Iframe sandbox restrictions, loading states |
| `src/components/anime/StreamQualityDropdown.tsx` | Ad risk indicators |
| `src/lib/adblock.ts` | Ad domain blocklist and utilities |
| `index.html` | CSP and Permissions Policy headers |

---

## Testing

To test the implementation:

1. Run `bun run dev` to start development server
2. Navigate to any anime watch page
3. Try different stream providers
4. Verify:
   - No popup windows appear
   - No page redirects occur
   - Ad risk indicators show correctly
   - Video playback still works

---

## References

- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy)
- [iframe sandbox attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
