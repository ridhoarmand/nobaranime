/**
 * Ad-blocking configuration for streaming providers
 * 
 * This file contains known ad networks and tracking domains used by
 * common streaming providers. These can be used to block ads via:
 * - CSP (Content Security Policy)
 * - Request interception (if using service workers)
 * - DNS-level blocking recommendations
 */

// Known ad networks and tracking domains commonly used by streaming providers
export const AD_DOMAINS = [
  // General ad networks
  'googlesyndication.com',
  'doubleclick.net',
  'adservice.google.com',
  'googleadservices.com',
  'googletagservices.com',
  'googletagmanager.com',
  'analytics.google.com',
  
  // Popunder/Popup ad networks
  'popads.net',
  'popadscdn.net',
  'propellerads.com',
  'propeller-tracking.com',
  'revenuehits.com',
  'adsrvr.org',
  'adcolony.com',
  'adsterra.com',
  'adnetworkperformance.com',
  'adskeeper.co.uk',
  'admixer.net',
  'adroll.com',
  'adform.net',
  'adnxs.com',
  'adsystem.io',
  'adtech.com',
  'advertising.com',
  'adswizz.com',
  'ads-twitter.com',
  'adsafeprotected.com',
  
  // Video ad networks
  'vidazoo.com',
  'vidible.tv',
  'vidora.com',
  'videoadex.com',
  'videostat.com',
  'zergnet.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'criteo.net',
  'contextweb.com',
  'casalemedia.com',
  'bluekai.com',
  'bidswitch.net',
  'bidtheatre.com',
  'betweendigital.com',
  'beeswax.com',
  'appnexus.com',
  'amazon-adsystem.com',
  'amplify.outbrain.com',
  '33across.com',
  'lijit.com',
  'liveramp.com',
  'krxd.net',
  'kargo.com',
  'indexww.com',
  'imrworldwide.com',
  'implix.com',
  'imhd.io',
  'hellobar.com',
  'grammarly.io',
  'freewheel.tv',
  'exoclick.com',
  'exdynsrv.com',
  'exitmonetization.com',
  'etargetnet.com',
  'emxdigital.com',
  'emjcd.com',
  'domdex.com',
  'demdex.net',
  'crazyegg.com',
  'connatix.com',
  'comscore.com',
  'cloudflareinsights.com',
  'chartbeat.com',
  'cdnwidget.com',
  'casamedia.co.uk',
  'carbonads.com',
  'bttrack.com',
  'brealtime.com',
  'brainient.com',
  'blueconic.net',
  'bizographics.com',
  'bing.com/ad',
  'bidvertiser.com',
  'betrad.com',
  'atomex.net',
  'atdmt.com',
  'assoc-amazon.com',
  'adsymptotic.com',
  'adsrvmedia.net',
  'adsniper.de',
  'adsnative.com',
  'adscale.de',
  'adrolays.de',
  'adrecover.com',
  'adman.gr',
  'adlightning.com',
  'adlegend.com',
  'adition.com',
  'adinsertion.com',
  'adify.com',
  'adhigh.net',
  'adgrx.com',
  'adform.io',
  'adextent.com',
  'adelement.com',
  'addthis.com',
  'addtoany.com',
  'addefend.com',
  'adbutler.de',
  'adbrite.com',
  'adblade.com',
  'adblockanalytics.com',
  'adblockplus.org',
  'adblockers.org',
  'adblockrelief.com',
  'adblockwarning.com',
  
  // Tracking domains
  'facebook.net',
  'connect.facebook.net',
  'facebook.com/tr',
  'pixel.facebook.com',
  'analytics.twitter.com',
  'static.ads-twitter.com',
  'snapchat.com',
  'sc-analytics.appspot.com',
  'bat.bing.com',
  'clarity.ms',
  'hotjar.com',
  'hotjar.io',
  'fullstory.com',
  'mouseflow.com',
  'luckyorange.com',
  'inspectlet.com',
  'crazyegg.com',
  
  // Specific to video streaming providers (vidhide, filedon, ondesu, etc.)
  'adsvidhide.com',
  'vidhide-ads.com',
  'filedon-ads.com',
  'ondesu-ads.com',
  'streamads.com',
  'videoadserver.com',
  'adserver.video',
  'ads.videostats.com',
  'prerollads.com',
  'midrollads.com',
  'postrollads.com',
  'videoadexchange.com',
  'adstreaming.net',
  'streamingads.net',
  'adsplayer.com',
  'adsplayer.net',
  'adplayer.video',
  'videoadplayer.com',
  'streamadserver.com',
  'adsstreamer.com',
  'videoadnetwork.com',
  'streamingadnetwork.com',
  'adserverstream.com',
  'videoadserver.net',
  'streamadsnetwork.com',
  'adsstreaming.com',
  'videostreamads.com',
  'streamvideoads.com',
  'adstreamvideo.com',
  'streamadvideo.com',
  'videoadstream.com',
  'advideostream.com',
  'streamvideonetwork.com',
  'videostreamnetwork.com',
  'streamnetworkads.com',
  'networkstreamads.com',
  'adsnetworkstream.com',
  'networkadsstream.com',
  'streamadsnetwork.com',
  'adsstreamnetwork.com',
  'streamnetworkvideo.com',
  'networkstreamvideo.com',
  'videonetworkstream.com',
  'networkvideos tream.com',
  'streamvideonetworkads.com',
  'videostreamnetworkads.com',
  'streamnetworkvideoads.com',
  'networkstreamvideoads.com',
  'videonetworkstreamads.com',
  'networkvideos treamads.com',
  
  // Common CDN domains used for ads
  'ads-cdn.com',
  'adcdn.net',
  'adcDN.com',
  'adsstatic.com',
  'adstatic.com',
  'adsstatic.net',
  'adstatic.net',
  'adsimage.com',
  'adimage.com',
  'adsimage.net',
  'adimage.net',
  'adserver.cdn',
  'ads.cdn',
  'ad.cdn',
  'ads.cloudflare.com',
  'ad.cloudflare.com',
  'cloudflareads.com',
  'cfads.net',
  'cf-adserver.com',
];

// Domains that should be allowed for streaming providers to function
export const ALLOWED_STREAMING_DOMAINS = [
  'vidhide.com',
  'vidhide.top',
  'vidhide.pro',
  'filedon.com',
  'filedon.xyz',
  'filedon.top',
  'mega.nz',
  'mega.co.nz',
  'mega.io',
  'ondesu.com',
  'ondesu.xyz',
  'ondesu.top',
  'ondesuhd.com',
  'updesu.com',
  'ondesu3.com',
  'odstream.com',
  'odstream.top',
  'odstream.xyz',
  'pdrain.com',
  'pdrain.top',
  'pdrain.xyz',
  'drive.google.com',
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'embedsu.ru',
  'embedsu.com',
  'suembed.com',
  'desufile.com',
  'desufile.top',
  'filedesu.com',
  'filedesu.top',
  'streamtape.com',
  'streamtape.to',
  'streamtape.xyz',
  'doodstream.com',
  'dood.to',
  'dood.watch',
  'doodstream.co',
  'doods.pro',
  'doods.yt',
  'dooood.com',
  'd000d.com',
  'd000d.com',
  'd0000d.com',
  'embtaku.com',
  'embtaku.pro',
  'embtaku.top',
  'asianembed.io',
  'asianembed.pro',
  'asianembed.top',
  'embedasian.com',
  'embedasian.pro',
  'embedasian.top',
  'playerasian.com',
  'playerasian.pro',
  'playerasian.top',
  'watchasian.io',
  'watchasian.pro',
  'watchasian.top',
  'gogoplay1.com',
  'gogoplay2.com',
  'gogoplay3.com',
  'gogoplay4.com',
  'gogohd.net',
  'gogohd.pro',
  'gogohd.top',
  'streamani.net',
  'streamani.pro',
  'streamani.top',
  'aniplay.net',
  'aniplay.pro',
  'aniplay.top',
  'aniwatch.net',
  'aniwatch.pro',
  'aniwatch.top',
  'animeembed.com',
  'animeembed.pro',
  'animeembed.top',
  'embedanime.com',
  'embedanime.pro',
  'embedanime.top',
  'playeranime.com',
  'playeranime.pro',
  'playeranime.top',
  'watchanime.io',
  'watchanime.pro',
  'watchanime.top',
  'streamanime.net',
  'streamanime.pro',
  'streamanime.top',
  'hdstreamani.com',
  'hdstreamani.pro',
  'hdstreamani.top',
  'streamanihd.com',
  'streamanihd.pro',
  'streamanihd.top',
  'anihdplay.com',
  'anihdplay.pro',
  'anihdplay.top',
  'hdanimeembed.com',
  'hdanimeembed.pro',
  'hdanimeembed.top',
  'animehdembed.com',
  'animehdembed.pro',
  'animehdembed.top',
  'embedanimehd.com',
  'embedanimehd.pro',
  'embedanimehd.top',
  'playeranimehd.com',
  'playeranimehd.pro',
  'playeranimehd.top',
  'watchanimehd.io',
  'watchanimehd.pro',
  'watchanimehd.top',
  'streamanimehd.net',
  'streamanimehd.pro',
  'streamanimehd.top',
];

// Patterns to detect ad URLs
export const AD_URL_PATTERNS = [
  /\/ads?\//i,
  /\/adserver\//i,
  /\/adbanner\//i,
  /\/advideo\//i,
  /\/preroll\//i,
  /\/midroll\//i,
  /\/postroll\//i,
  /\/popunder\//i,
  /\/popup\//i,
  /\/popunder\//i,
  /ad\.js$/i,
  /ads\.js$/i,
  /adserver\.js$/i,
  /adbanner\.js$/i,
  /advideo\.js$/i,
  /\.ad\./i,
  /_ad\./i,
  /-ad\./i,
  /adsbygoogle/i,
  /doubleclick/i,
  /googleadservices/i,
  /googlesyndication/i,
  /googletagservices/i,
  /googletagmanager/i,
  /facebook.*pixel/i,
  /fb.*pixel/i,
  /tracking/i,
  /analytics/i,
  /telemetry/i,
  /beacon/i,
  /pixel/i,
  /tracker/i,
  /stat/i,
  /stats/i,
  /counter/i,
  /metric/i,
  /log\?/i,
  /event\?/i,
  /impression/i,
  /viewtrack/i,
  /clicktrack/i,
  /adtrack/i,
  /adclick/i,
  /adview/i,
  /adimp/i,
  /adlog/i,
  /adstat/i,
  /adcounter/i,
  /admetric/i,
  /adbeacon/i,
  /adpixel/i,
  /adtracker/i,
  /adanalytics/i,
  /adtelemetry/i,
];

/**
 * Check if a URL matches any ad pattern
 */
export function isAdUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if hostname matches any ad domain
    if (AD_DOMAINS.some(domain => hostname.includes(domain))) {
      return true;
    }
    
    // Check if URL matches any ad pattern
    if (AD_URL_PATTERNS.some(pattern => pattern.test(url))) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is from an allowed streaming provider
 */
export function isAllowedStreamingDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return ALLOWED_STREAMING_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Generate CSP directive to block ad domains
 */
export function generateCSPDirectives(): string {
  return `
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
  `.trim().replace(/\s+/g, ' ');
}

export default {
  AD_DOMAINS,
  ALLOWED_STREAMING_DOMAINS,
  AD_URL_PATTERNS,
  isAdUrl,
  isAllowedStreamingDomain,
  generateCSPDirectives,
};
