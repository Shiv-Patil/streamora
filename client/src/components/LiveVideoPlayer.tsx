import React, { useCallback, useEffect, useRef, useState } from "react";
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
  HeartIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { LoadingSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import LiveChat from "@/components/LiveChat";
import UserAvatar from "@/components/UserAvatar";
import { getStreamUrl } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import TimeSince from "@/components/TimeSince";
import defaultProfileBanner from "@/assets/banner.png";

export interface LiveVideoPlayerProps {
  isLive?: boolean;
  isFollowing?: boolean;
  streamerUsername?: string;
  streamerProfilePicture?: string;
  streamerProfileBanner?: string | null;
  streamerFollowers?: number;
  streamerBio?: string;
  streamTitle?: string;
  streamCategory?: string;
  streamStartedAt?: number;
  viewerCount?: number;
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
  type: "disconnected" | "network" | "media" | "fatal";
  message: string;
  retry?: () => void;
};

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

const LiveVideoPlayer: React.FC<LiveVideoPlayerProps> = ({
  isLive,
  isFollowing,
  streamTitle,
  viewerCount,
  streamerUsername,
  streamerProfilePicture,
  streamerProfileBanner,
  streamerFollowers,
  streamerBio,
  streamCategory,
  streamStartedAt,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamUrl = getStreamUrl(streamerUsername || "");

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
    isMuted: true,
    error: null,
    showQualityMenu: false,
    currentQuality: -1,
    qualities: [],
    isAutoQuality: true,
    showSettings: false,
    latencyMode: "low", // 'low', 'normal'
  });

  const handleError = (error: PlayerError) => {
    setPlayerState((prev) => ({ ...prev, error: error.message }));
    if (error.type === "disconnected") {
      setTimeout(() => {
        error.retry?.();
      }, 5000);
    }
  };

  const updateQualityLevels = useCallback(
    (hls: Hls) => {
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
    },
    [setPlayerState]
  );

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
    } catch (err) {
      console.error(err);
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
          setPlayerState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
          }));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          updateQualityLevels(hls);
        });

        hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                handleError({
                  type:
                    data.response?.code === 404 ? "disconnected" : "network",
                  message:
                    data.response?.code === 404
                      ? "Streamer disconnected"
                      : (data.reason ?? ""),
                  retry: () => hls.loadSource(streamUrl),
                });
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                handleError({
                  type: "media",
                  message: "Media error",
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
          },
          pause: () => {
            setPlayerState((prev) => ({ ...prev, isPlaying: false }));
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
  }, [streamUrl, updateQualityLevels]);

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
        "absolute bottom-0 left-0 right-0 top-0 flex gap-4 max-md:flex-col",
        isTheaterMode ? "fixed inset-0 z-50 h-screen gap-0 bg-background" : ""
      )}
    >
      <div
        className={cn(
          "relative overflow-auto rounded-xl bg-card p-4 md:flex-1",
          isTheaterMode ? "rounded-none p-0" : ""
        )}
      >
        {isLive ? (
          <div
            ref={containerRef}
            className={cn(
              "group relative mx-auto max-h-full bg-black",
              isTheaterMode ? "md:h-full" : "aspect-video"
            )}
          >
            <video
              ref={videoRef}
              className="h-full w-full"
              playsInline
              autoPlay
              muted={playerState.isMuted}
            />

            {/* Title Bar */}
            <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {streamTitle}
                  </h2>
                  <p className="text-sm text-white/80">{streamerUsername}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1">
                    <EyeIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-white">
                      {viewerCount || 0}
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
                  <p className="font-medium text-red-500">
                    {playerState.error}
                  </p>
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
        ) : (
          <div className={cn("banner-bg relative h-[30rem] w-full")}>
            {streamerProfileBanner !== undefined ? (
              <img
                src={streamerProfileBanner ?? defaultProfileBanner}
                className="absolute left-0 top-0 h-full w-full object-cover"
                alt="banner"
              ></img>
            ) : null}
          </div>
        )}
        <div
          className={cn(
            "flex flex-col gap-4 pt-4",
            isTheaterMode ? "hidden" : ""
          )}
        >
          <div className="flex items-center gap-2 max-md:flex-col max-md:items-start">
            <div className="flex flex-1 items-center gap-2">
              <UserAvatar
                className="h-16 w-16"
                profilePicture={streamerProfilePicture}
              />
              <div className="flex flex-1 flex-col items-start gap-1">
                <span className="text-lg">
                  {streamerUsername ? (
                    streamerUsername
                  ) : (
                    <Skeleton className="h-6 w-40" />
                  )}
                </span>
                {isLive ? (
                  <div className="flex flex-col items-start gap-2">
                    <span className="flex flex-col self-stretch text-sm">
                      {streamTitle ? (
                        streamTitle
                      ) : (
                        <Skeleton className="h-4 min-w-0 max-w-64" />
                      )}
                    </span>
                    {streamCategory ? (
                      <span className="rounded-full bg-muted px-2 py-[.125rem] text-sm text-muted-foreground">
                        {streamCategory}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                className="flex gap-2 rounded-lg"
                disabled={isFollowing}
                variant={isFollowing ? "outline" : "default"}
              >
                {isFollowing ? (
                  <>
                    Following <CheckIcon className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    <HeartIcon className="h-5 w-5" />
                    Follow
                  </>
                )}
              </Button>
              <span className="font-mono text-xs">
                {streamStartedAt ? (
                  <TimeSince startTime={streamStartedAt} />
                ) : null}
              </span>
            </div>
          </div>
          {streamerBio !== undefined ? (
            <div className="flex w-full max-w-2xl flex-col gap-2 self-center text-lg">
              <span>About {streamerUsername}</span>
              <div className="flex flex-col gap-4 rounded-lg bg-muted p-4 text-base">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {streamerFollowers?.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                {streamerBio}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <LiveChat
        className={cn(
          "bottom-4 left-4 w-[300px] rounded-xl bg-card max-md:h-96 max-md:w-full",
          isLive ? "" : "hidden"
        )}
      />
    </div>
  );
};

export default LiveVideoPlayer;
