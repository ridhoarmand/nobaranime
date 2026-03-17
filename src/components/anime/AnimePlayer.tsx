import { useState, useEffect, useMemo } from 'react';
import { Stream } from '../../types/anime';
import { AlertCircle, Shield, ShieldAlert, ShieldOff, ShieldCheck, Settings } from 'lucide-react';
import { StreamQualityDropdown } from './StreamQualityDropdown';
import { getSandboxConfig, generateSandboxAttribute, getAdRiskLevel } from '../../lib/playerConfig';

interface AnimePlayerProps {
  streams: Stream[];
  title: string;
}

export function AnimePlayer({ streams, title }: AnimePlayerProps) {
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [sandboxMode, setSandboxMode] = useState<'auto' | 'strict' | 'permissive'>('auto');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (streams && streams.length > 0) {
      const defaultStream = streams.find((s) => s.is_default === 1) || streams[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStream(defaultStream);
    }
  }, [streams]);

  const sandboxValue = useMemo(() => {
    if (!currentStream?.url) return 'allow-scripts allow-same-origin';

    // ALWAYS disable sandbox for Vidhide/Filedon (except in strict mode)
    // These providers block sandboxed iframes
    if (sandboxMode !== 'strict') {
      const config = getSandboxConfig(currentStream.url);
      if (config.preset === 'none') {
        console.log('[AnimePlayer] Disabling sandbox for provider:', currentStream.provider);
        return null;
      }
    }

    if (sandboxMode === 'strict') {
      return 'allow-scripts allow-same-origin';
    }

    if (sandboxMode === 'permissive') {
      return 'allow-scripts allow-same-origin allow-presentation';
    }

    // Auto mode - use provider-specific config
    const config = getSandboxConfig(currentStream.url);

    // If preset is 'none', return null to indicate no sandbox should be used
    if (config.preset === 'none') {
      console.log('[AnimePlayer] Disabling sandbox for provider:', currentStream.provider);
      return null;
    }

    const sandbox = generateSandboxAttribute(config);
    console.log('[AnimePlayer] Using sandbox:', sandbox);
    return sandbox;
  }, [currentStream, sandboxMode]);

  const needsSandbox = sandboxValue !== null;

  const getAdRiskInfo = () => {
    if (!currentStream?.url) return { level: 'medium', icon: Shield, color: 'text-yellow-500' };
    
    if (sandboxMode === 'strict') {
      return { level: 'low', icon: ShieldCheck, color: 'text-green-500' };
    }
    
    if (sandboxMode === 'permissive') {
      return { level: 'high', icon: ShieldOff, color: 'text-red-500' };
    }
    
    const config = getSandboxConfig(currentStream.url);
    const risk = getAdRiskLevel(config.preset);
    
    const iconMap = {
      low: Shield,
      medium: ShieldAlert,
      high: ShieldOff,
    };
    
    const colorMap = {
      low: 'text-green-500',
      medium: 'text-yellow-500',
      high: 'text-red-500',
    };
    
    return {
      level: risk,
      icon: iconMap[risk],
      color: colorMap[risk],
    };
  };

  const adRiskInfo = getAdRiskInfo();
  const AdIcon = adRiskInfo.icon;

  if (!streams || streams.length === 0) {
    return (
      <div className="aspect-video w-full bg-black flex flex-col items-center justify-center text-gray-500 rounded-xl border border-zinc-800">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p>No streams available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
        {currentStream ? (
          <>
            {needsSandbox ? (
              <iframe
                key={`stream-${currentStream.id}`}
                src={currentStream.url}
                title={title}
                className="w-full h-full border-0 absolute inset-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox={sandboxValue || ''}
              />
            ) : (
              <iframe
                key={`stream-${currentStream.id}`}
                src={currentStream.url}
                title={title}
                className="w-full h-full border-0 absolute inset-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controls below player - doesn't overlap iframe */}
      {currentStream && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs">
            <AdIcon className={`w-4 h-4 ${adRiskInfo.color}`} />
            <span className="text-zinc-300 capitalize">{adRiskInfo.level} ads risk</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white p-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-semibold">Settings</span>
            </button>

            {showSettings && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSettings(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-3 z-50">
                  <h4 className="text-xs font-semibold text-zinc-400 mb-2">Sandbox Mode</h4>

                  {/* Filedon Warning */}
                  {currentStream?.provider?.toLowerCase().includes('filedon') && (
                    <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-2 mb-2">
                      <p className="text-[10px] text-red-400 font-bold mb-1">
                        ⚠️ PERINGATAN: FILEDON
                      </p>
                      <p className="text-[10px] text-red-300">
                        Provider ini menampilkan **iklan judi online** yang sangat agresif.
                      </p>
                      <p className="text-[10px] text-red-400 mt-1">
                        💡 Gunakan **uBlock Origin** atau pilih mirror lain!
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setSandboxMode('strict')}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      sandboxMode === 'strict'
                        ? 'bg-green-500/20 text-green-400'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Strict</span>
                    </div>
                    <p className="text-[10px] mt-0.5 text-zinc-500">Max ad protection, may break some players</p>
                  </button>

                  <button
                    onClick={() => setSandboxMode('auto')}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      sandboxMode === 'auto'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Auto (Recommended)</span>
                    </div>
                    <p className="text-[10px] mt-0.5 text-zinc-500">Provider-specific settings</p>
                  </button>

                  <button
                    onClick={() => setSandboxMode('permissive')}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      sandboxMode === 'permissive'
                        ? 'bg-red-500/20 text-red-400'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldOff className="w-3 h-3" />
                      <span>Permissive</span>
                    </div>
                    <p className="text-[10px] mt-0.5 text-zinc-500">Max compatibility</p>
                  </button>

                  <div className="border-t border-zinc-800 my-2" />

                  <div className="space-y-2">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                      <p className="text-[10px] text-blue-400">
                        ⚠️ <strong>Disclaimer:</strong> Iklan yang muncul berasal dari player pihak ketiga, bukan dari website ini.
                      </p>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                      <p className="text-[10px] text-green-400">
                        🛡️ <strong>Anti-Judol:</strong> Kami tidak mendukung perjudian online. Blokir iklan judi dengan uBlock Origin.
                      </p>
                    </div>

                    <a
                      href="https://ublockorigin.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1.5 rounded-lg transition-colors"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Download uBlock Origin</span>
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <StreamQualityDropdown streams={streams} currentStream={currentStream} onStreamSelect={setCurrentStream} />
    </div>
  );
}
