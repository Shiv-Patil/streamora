import LiveVideoPlayer from "@/components/LiveVideoPlayer";

function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-8 px-8 pb-4">
      <div className="flex h-full flex-col items-center gap-6 self-stretch rounded-xl bg-card/50 p-4">
        <LiveVideoPlayer streamUrl="http://localhost:9000/stream/f20230740/index.m3u8" />
      </div>
    </div>
  );
}

export default Home;
