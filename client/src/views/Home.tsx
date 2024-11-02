import {
  StreamPreview,
  StreamPreviewSkeleton,
} from "@/components/StreamPreview";
import { useAuth } from "@/hooks/Auth";
import useFeed from "@/hooks/Feed";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

function Home() {
  const feedQueryResult = useFeed();
  const { authState } = useAuth();

  return (
    <div className="relative mx-4 mb-4 flex min-h-full flex-1 flex-col">
      {!feedQueryResult.data ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          <StreamPreviewSkeleton />
          <StreamPreviewSkeleton />
        </div>
      ) : !feedQueryResult.data.feed.length ? (
        <div className="flex h-full w-full flex-col items-center justify-center text-center text-lg text-muted-foreground">
          <ExclamationCircleIcon className="h-10 w-10" />
          Looks like no one is streaming
          <br />
          {authState
            ? "Start streaming by going to the dashboard!"
            : "Be the first to stream by signing in!"}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {feedQueryResult.data.feed.map((channel, key) => (
            <StreamPreview {...channel} key={key} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;
