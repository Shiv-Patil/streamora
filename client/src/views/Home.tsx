import LiveVideoPlayer from "@/components/LiveVideoPlayer";

function Home() {
  return (
    <div className="mx-auto flex min-h-full flex-1 flex-col gap-8 p-4 pt-0">
      <div className="relative h-full self-stretch">
        <LiveVideoPlayer streamUrl="http://localhost:9000/stream/f20230740/index.m3u8" />
      </div>
    </div>
  );
}

export default Home;
