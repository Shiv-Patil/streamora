import { useMemo, useState } from "react";
import {
  EyeIcon,
  EyeSlashIcon,
  ClipboardIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RTMP_URL } from "@/lib/constants";
import useProfile from "@/hooks/Profile";

export default function Credentials() {
  const { data: userProfile } = useProfile();
  const [showStreamKey, setShowStreamKey] = useState(false);

  const rtmpUrl = RTMP_URL;
  const streamKey = useMemo(() => userProfile?.streamKey, [userProfile]);

  const toggleStreamKeyVisibility = () => {
    setShowStreamKey(!showStreamKey);
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Copied!");
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-4 rounded-xl bg-card p-4 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Credentials</h1>

        <div className="space-y-2">
          <Label htmlFor="rtmp-url">RTMP Server URL</Label>
          <div className="flex">
            <Input
              id="rtmp-url"
              value={rtmpUrl}
              readOnly
              className="flex-grow"
            />
            <Button
              variant="outline"
              size="icon"
              className="ml-2"
              onClick={() => copyToClipboard(rtmpUrl)}
            >
              <ClipboardIcon className="h-4 w-4" />
              <span className="sr-only">Copy RTMP URL</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-key">Stream Key</Label>
          <div className="flex">
            <Input
              id="stream-key"
              type={showStreamKey ? "text" : "password"}
              value={streamKey}
              readOnly
              className="flex-grow"
            />
            <Button
              variant="outline"
              size="icon"
              className="ml-2"
              onClick={toggleStreamKeyVisibility}
            >
              {showStreamKey ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showStreamKey ? "Hide" : "Show"} stream key
              </span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="ml-2"
              onClick={() => copyToClipboard(streamKey)}
            >
              <ClipboardIcon className="h-4 w-4" />
              <span className="sr-only">Copy stream key</span>
            </Button>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Keep your stream key secret. Never share it with anyone.
        </p>
      </div>
    </div>
  );
}
