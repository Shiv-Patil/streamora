import React, { useEffect, useRef, useState, useCallback } from "react";
import { debounce } from "lodash";
import { LoadingSpinner } from "./ui/spinner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  color?: string;
}

interface LiveChatProps {
  className?: string;
  onSendMessage?: (message: string) => void;
}

const LiveChat: React.FC<LiveChatProps> = ({
  className = "",
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const checkIfNearBottom = useCallback(() => {
    if (!chatContainerRef.current) return true;

    const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    return scrollBottom < 500;
  }, []);

  const handleScroll = debounce(() => {
    setIsNearBottom(checkIfNearBottom());
  }, 150);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;
    chatContainer.addEventListener("scroll", handleScroll);
    return () => chatContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer || !isNearBottom) return;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [messages, isNearBottom]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim()) return;

      if (newMessage === "clear") {
        setMessages([]);
        setNewMessage("");
        return;
      }

      const message: ChatMessage = {
        id: Date.now().toString(),
        username: "You",
        message: newMessage,
        timestamp: new Date().toISOString(),
        color: "#00ff00",
      };

      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      onSendMessage?.(newMessage);

      setTimeout(() => {
        const chatContainer = chatContainerRef.current;
        if (!chatContainer) return;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
    },
    [onSendMessage, newMessage]
  );

  return (
    <div className={cn("flex h-full flex-col bg-gray-900", className)}>
      <div className="flex items-center gap-2 p-4">
        <h3 className="text-lg font-semibold">Live Chat</h3>
        <span className="pt-1 text-sm text-muted-foreground">
          (doesn&apos;t work)
        </span>
      </div>
      <Separator />

      <div
        ref={chatContainerRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4"
      >
        {/* Loading indicator */}
        {loading && (
          <div className="py-2 text-center">
            <LoadingSpinner className="mx-auto h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in">
            <span className="text-sm" style={{ color: msg.color }}>
              {msg.username}
            </span>
            : <span className="text-sm text-foreground">{msg.message}</span>
            {/* <span className="text-sm text-muted-foreground">
                {format(new Date(msg.timestamp), "HH:mm")}
              </span> */}
          </div>
        ))}
      </div>

      <Separator />

      {/* Chat Input */}
      <form
        onSubmit={handleSendMessage}
        className="flex w-full items-center p-4"
      >
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message"
            maxLength={200}
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LiveChat;
