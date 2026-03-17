/**
 * Player sandbox configuration for different streaming providers
 * 
 * Some providers require less restrictive sandbox settings to function properly.
 * This file maps provider domains to their recommended sandbox configurations.
 */

export type SandboxPreset = 'strict' | 'standard' | 'permissive' | 'none';

export interface SandboxConfig {
  preset: SandboxPreset;
  allowPresentation?: boolean;
  allowPopups?: boolean;
  allowTopNavigation?: boolean;
  description: string;
}

/**
 * Sandbox configurations for different providers
 * 
 * Notes:
 * - Some providers detect sandbox and refuse playback
 * - Some providers require allow-presentation for Chromecast
 * - Popups are generally blocked for ad protection
 */
export const PROVIDER_SANDBOX_CONFIG: Record<string, SandboxConfig> = {
  // Strict mode - maximum ad protection
  'mega.nz': {
    preset: 'strict',
    description: 'Maximum ad protection',
  },
  'mega.co.nz': {
    preset: 'strict',
    description: 'Maximum ad protection',
  },
  'drive.google.com': {
    preset: 'strict',
    description: 'Maximum ad protection',
  },
  'youtube.com': {
    preset: 'strict',
    description: 'Maximum ad protection',
  },
  'youtube-nocookie.com': {
    preset: 'strict',
    description: 'Maximum ad protection',
  },
  
  // Standard mode - balanced protection & compatibility
  // Providers that BLOCK sandboxed iframes - MUST use preset: 'none'
  'vidhide.com': {
    preset: 'none', // Vidhide blocks sandboxed iframes
    allowPresentation: true,
    description: 'No sandbox - Vidhide requires this',
  },
  'vidhide.top': {
    preset: 'none',
    allowPresentation: true,
    description: 'No sandbox - Vidhide requires this',
  },
  'vidhide.pro': {
    preset: 'none',
    allowPresentation: true,
    description: 'No sandbox - Vidhide requires this',
  },
  'vidhide.xyz': {
    preset: 'none',
    allowPresentation: true,
    description: 'No sandbox - Vidhide requires this',
  },
  'filedon.com': {
    preset: 'none', // Filedon also blocks sandboxed iframes
    allowPresentation: true,
    description: 'No sandbox - Filedon requires this',
  },
  'filedon.xyz': {
    preset: 'none',
    allowPresentation: true,
    description: 'No sandbox - Filedon requires this',
  },
  'filedon.top': {
    preset: 'none',
    allowPresentation: true,
    description: 'No sandbox - Filedon requires this',
  },
  'filedon.pro': {
    preset: 'none',
    allowPresentation: true,
    description: 'No sandbox - Filedon requires this',
  },
  'streamtape.com': {
    preset: 'standard',
    allowPresentation: true,
    description: 'Balanced - allows Chromecast',
  },
  'doodstream.com': {
    preset: 'standard',
    allowPresentation: true,
    description: 'Balanced - allows Chromecast',
  },
  
  // Permissive mode - for providers that refuse strict sandbox
  'ondesu.com': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false, // Still block popups
    description: 'Compatible mode - some ads may appear',
  },
  'ondesu.xyz': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
  'ondesu.top': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
  'ondesuhd.com': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
  'updesu.com': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
  'ondesu3.com': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
  'odstream.com': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
  'pdrain.com': {
    preset: 'permissive',
    allowPresentation: true,
    allowPopups: false,
    description: 'Compatible mode - some ads may appear',
  },
};

/**
 * Get sandbox configuration for a provider URL
 */
export function getSandboxConfig(url: string): SandboxConfig {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check for exact match first
    if (PROVIDER_SANDBOX_CONFIG[hostname]) {
      return PROVIDER_SANDBOX_CONFIG[hostname];
    }
    
    // Check for domain match
    for (const [domain, config] of Object.entries(PROVIDER_SANDBOX_CONFIG)) {
      if (hostname.endsWith('.' + domain) || hostname === domain) {
        return config;
      }
    }
    
    // Fallback: Check if URL contains known provider names
    // This catches subdomains and alternative TLDs
    const noSandboxProviders = ['vidhide', 'filedon'];
    for (const provider of noSandboxProviders) {
      if (hostname.includes(provider)) {
        return {
          preset: 'none',
          allowPresentation: true,
          description: `No sandbox - ${provider} requires this`,
        };
      }
    }
    
    // Default to standard for unknown providers
    return {
      preset: 'standard',
      allowPresentation: true,
      description: 'Unknown provider - standard protection',
    };
  } catch {
    // If URL parsing fails, use permissive as fallback
    return {
      preset: 'permissive',
      allowPresentation: true,
      description: 'Invalid URL - permissive mode',
    };
  }
}

/**
 * Generate sandbox attribute string from config
 */
export function generateSandboxAttribute(config: SandboxConfig): string {
  // No sandbox at all for providers that block it
  if (config.preset === 'none') {
    return '';
  }
  
  const permissions = [
    'allow-scripts',
    'allow-same-origin',
  ];
  
  if (config.allowPresentation) {
    permissions.push('allow-presentation');
  }
  
  if (config.allowPopups) {
    permissions.push('allow-popups');
  }
  
  if (config.allowTopNavigation) {
    permissions.push('allow-top-navigation');
  }
  
  return permissions.join(' ');
}

/**
 * Get human-readable ad risk level
 */
export function getAdRiskLevel(preset: SandboxPreset): 'low' | 'medium' | 'high' {
  switch (preset) {
    case 'strict':
      return 'low';
    case 'standard':
      return 'medium';
    case 'permissive':
    case 'none':
      return 'high';
    default:
      return 'medium';
  }
}

export default {
  PROVIDER_SANDBOX_CONFIG,
  getSandboxConfig,
  generateSandboxAttribute,
  getAdRiskLevel,
};
