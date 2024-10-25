import React, { useEffect, useRef, useState } from "react";
import Hls, { ErrorData, Level } from "hls.js";
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ChevronUpIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  EyeIcon,
  Cog6ToothIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { LoadingSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import LiveChat from "./LiveChat";

interface LiveVideoPlayerProps {
  streamUrl: string;
  streamTitle?: string;
  viewerCount?: number;
  streamerUsername?: string;
  onError?: (error: string) => void;
  onPlay?: () => void;
  onPause?: () => void;
  initialMuted?: boolean;
}

interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  error: string | null;
  showQualityMenu: boolean;
  currentQuality: number;
  qualities: Quality[];
  isAutoQuality: boolean;
  showSettings: boolean;
  latencyMode: "low" | "normal";
}

interface Quality {
  id: number;
  height: number;
  width: number;
  bitrate: number;
  label: string;
}

type PlayerError = {
  type: "network" | "media" | "fatal";
  message: string;
  retry?: () => void;
};

const LiveVideoPlayer: React.FC<LiveVideoPlayerProps> = ({
  streamUrl,
  streamTitle = "Live Stream",
  viewerCount = 0,
  streamerUsername = "streamer",
  onError,
  onPlay,
  onPause,
  initialMuted = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({
    buffered: 0,
    latency: 0,
  });

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    isLoading: true,
    isMuted: initialMuted,
    error: null,
    showQualityMenu: false,
    currentQuality: -1,
    qualities: [],
    isAutoQuality: true,
    showSettings: false,
    latencyMode: "low", // 'low', 'normal'
  });

  const formatBitrate = (bitrate: number): string => {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  };

  const formatResolution = (_width: number, height: number): string => {
    if (height >= 2160) return "4K";
    if (height >= 1440) return "2K";
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return `${height}p`;
  };

  const handleError = (error: PlayerError) => {
    setPlayerState((prev) => ({ ...prev, error: error.message }));
    onError?.(error.message);

    if (error.type === "network") {
      // Implement exponential backoff for network errors
      setPlayerState((state) => ({
        ...state,
        error: "Network error",
      }));
    } else if (error.retry) {
      error.retry();
    }
  };

  const updateQualityLevels = (hls: Hls) => {
    const qualities: Quality[] = hls.levels.map(
      (level: Level, index: number) => ({
        id: index,
        height: level.height,
        width: level.width,
        bitrate: level.bitrate,
        label: `${formatResolution(level.width, level.height)} (${formatBitrate(level.bitrate)})`,
      })
    );

    setPlayerState((prev) => ({
      ...prev,
      qualities,
      currentQuality: hls.currentLevel,
      isAutoQuality: hls.autoLevelEnabled,
    }));
  };

  const handleQualityChange = (qualityId: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (qualityId === -1) {
      hls.currentLevel = -1;
      setPlayerState((prev) => ({
        ...prev,
        currentQuality: -1,
        isAutoQuality: true,
        showQualityMenu: false,
      }));
    } else {
      hls.currentLevel = qualityId;
      setPlayerState((prev) => ({
        ...prev,
        currentQuality: qualityId,
        isAutoQuality: false,
        showQualityMenu: false,
      }));
    }
  };

  const handlePlayPause = async (): Promise<void> => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        // Sync to latest live position
        if (hlsRef.current) {
          const levels = hlsRef.current.levels;
          for (let index = 0; index < levels.length; index++) {
            const fragments = levels[index].details?.fragments;
            if (fragments && fragments.length > 0) {
              const latestFragment = fragments[fragments.length - 1];
              video.currentTime = latestFragment.start;
              break;
            }
          }
        }
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      handleError({
        type: "media",
        message: "Playback failed",
      });
    }
  };

  const toggleMute = (): void => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setPlayerState((prev) => ({ ...prev, isMuted: video.muted }));
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const toggleTheaterMode = () => {
    setIsTheaterMode(!isTheaterMode);
  };

  const toggleLatencyMode = () => {
    if (!hlsRef.current) return;
    hlsRef.current.lowLatencyMode = playerState.latencyMode === "normal";
    setPlayerState((prev) => ({
      ...prev,
      latencyMode: prev.latencyMode === "low" ? "normal" : "low",
      showSettings: false,
    }));
    // Reconnect to the stream
    hlsRef.current.stopLoad();
    hlsRef.current.startLoad();
  };

  useEffect(() => {
    if (!streamUrl) return;

    const initPlayer = (): (() => void) => {
      const video = videoRef.current;
      if (!video) return () => {};

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 5,
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          debug: false,
        });

        hlsRef.current = hls;
        hls.attachMedia(video);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(streamUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPlayerState((prev) => ({ ...prev, isLoading: false }));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          updateQualityLevels(hls);
        });

        hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                handleError({
                  type: "network",
                  message: data.reason ?? "",
                  retry: () => hls.startLoad(),
                });
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                handleError({
                  type: "media",
                  message: "Media error, recovering...",
                  retry: () => hls.recoverMediaError(),
                });
                break;
              default:
                handleError({
                  type: "fatal",
                  message: "Fatal error encountered",
                  retry: () => {
                    destroyPlayer();
                    initPlayer();
                  },
                });
                break;
            }
          }
        });

        const videoEventListeners: Record<string, EventListener> = {
          playing: () => {
            setPlayerState((prev) => ({
              ...prev,
              isPlaying: true,
              isLoading: false,
            }));
            onPlay?.();
          },
          pause: () => {
            setPlayerState((prev) => ({ ...prev, isPlaying: false }));
            onPause?.();
          },
          waiting: () =>
            setPlayerState((prev) => ({ ...prev, isLoading: true })),
          canplay: () =>
            setPlayerState((prev) => ({ ...prev, isLoading: false })),
        };

        Object.entries(videoEventListeners).forEach(([event, listener]) => {
          video.addEventListener(event, listener);
        });

        return () => {
          Object.entries(videoEventListeners).forEach(([event, listener]) => {
            video.removeEventListener(event, listener);
          });
        };
      } else {
        handleError({
          type: "fatal",
          message: "HLS is not supported in your browser",
        });
      }
      return () => {};
    };

    const destroyPlayer = (): void => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    const cleanup = initPlayer();
    return () => {
      destroyPlayer();
      cleanup();
    };
  }, [streamUrl, onError, onPlay, onPause]);

  useEffect(() => {
    const updateStats = () => {
      if (videoRef.current && hlsRef.current) {
        setStats({
          buffered:
            videoRef.current.buffered.length > 0
              ? videoRef.current.buffered.end(0) -
                videoRef.current.buffered.start(0)
              : 0,
          latency: hlsRef.current.latency || 0,
        });
      }
    };

    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 top-0 flex gap-4",
        isTheaterMode ? "fixed inset-0 z-50 h-screen gap-0 bg-background" : ""
      )}
    >
      <div
        className={cn(
          "relative flex-1 overflow-auto rounded-xl bg-card p-4",
          isTheaterMode ? "rounded-none p-0" : ""
        )}
      >
        <div
          ref={containerRef}
          className={cn(
            "group relative bg-black",
            isTheaterMode ? "h-full" : "aspect-video"
          )}
        >
          <video
            ref={videoRef}
            className="h-full w-full"
            playsInline
            muted={playerState.isMuted}
          />

          {/* Title Bar */}
          <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{streamTitle}</h2>
                <p className="text-sm text-white/80">{streamerUsername}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1">
                  <EyeIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-white">
                    {viewerCount.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-white">LIVE</span>
              </div>
            </div>
          </div>

          {playerState.isLoading && !playerState.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <LoadingSpinner className="h-12 w-12 text-white" />
            </div>
          )}

          {playerState.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              <div className="p-4 text-center text-white">
                <p className="font-medium text-red-500">{playerState.error}</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex w-full items-center gap-4">
              {/* Basic controls */}
              <button
                onClick={() => {
                  void handlePlayPause();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                aria-label={playerState.isPlaying ? "Pause" : "Play"}
              >
                {playerState.isPlaying ? (
                  <PauseIcon className="h-6 w-6 text-white" />
                ) : (
                  <PlayIcon className="h-6 w-6 text-white" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                aria-label={playerState.isMuted ? "Unmute" : "Mute"}
              >
                {playerState.isMuted ? (
                  <SpeakerXMarkIcon className="h-6 w-6 text-white" />
                ) : (
                  <SpeakerWaveIcon className="h-6 w-6 text-white" />
                )}
              </button>

              <div className="ml-auto flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-white">LIVE</span>
              </div>

              <div className="relative ml-2">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({
                      ...prev,
                      showQualityMenu: !prev.showQualityMenu,
                    }))
                  }
                  className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-2 text-sm text-white transition-colors hover:bg-white/30"
                >
                  {playerState.isAutoQuality
                    ? "Auto"
                    : formatResolution(
                        playerState.qualities[playerState.currentQuality]
                          ?.width || 0,
                        playerState.qualities[playerState.currentQuality]
                          ?.height || 0
                      )}
                  <ChevronUpIcon
                    className={`h-4 w-4 transition-transform ${
                      playerState.showQualityMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {playerState.showQualityMenu && (
                  <div className="absolute bottom-full mb-2 w-48 rounded-lg bg-black/90 p-2">
                    <button
                      onClick={() => handleQualityChange(-1)}
                      className={`w-full rounded px-3 py-2 text-left text-sm ${
                        playerState.isAutoQuality
                          ? "bg-white/20 text-white"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      Auto
                    </button>
                    {playerState.qualities.map((quality) => (
                      <button
                        key={quality.id}
                        onClick={() => handleQualityChange(quality.id)}
                        className={`w-full rounded px-3 py-2 text-left text-sm ${
                          quality.id === playerState.currentQuality &&
                          !playerState.isAutoQuality
                            ? "bg-white/20 text-white"
                            : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        {quality.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() =>
                    setPlayerState((prev) => ({
                      ...prev,
                      showSettings: !prev.showSettings,
                    }))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                >
                  <Cog6ToothIcon className="h-6 w-6 text-white" />
                </button>

                {playerState.showSettings && (
                  <div className="absolute bottom-full mb-2 w-48 rounded-lg bg-black/90 p-2">
                    <div className="mb-2 px-3 py-1 text-sm text-white/60">
                      Settings
                    </div>
                    <button
                      onClick={() => setShowStats(!showStats)}
                      className="w-full rounded px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                    >
                      {showStats ? "Hide Stats" : "Show Stats"}
                    </button>
                    <div className="px-3 py-1 text-sm text-white/60">
                      Latency Mode:{" "}
                      {playerState.latencyMode === "low" ? "LOW" : "NORMAL"}
                    </div>
                    <button
                      onClick={() => toggleLatencyMode()}
                      className="w-full rounded px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                    >
                      Toggle
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1" />
              {/* Theater Mode */}
              <button
                onClick={toggleTheaterMode}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              >
                <VideoCameraIcon className="h-6 w-6 text-white" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => {
                  void toggleFullscreen();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="h-6 w-6 text-white" />
                ) : (
                  <ArrowsPointingOutIcon className="h-6 w-6 text-white" />
                )}
              </button>

              {/* Stats Display */}
              {showStats && (
                <div className="ml-auto rounded bg-black/60 p-2 text-xs text-white">
                  <div>Buffer: {stats.buffered.toFixed(1)}s</div>
                  <div>Latency: {stats.latency.toFixed(2)}s</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <LiveChat className="w-[300px] rounded-xl bg-card" />
    </div>
  );
};

export default LiveVideoPlayer;
