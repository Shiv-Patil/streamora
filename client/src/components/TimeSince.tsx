import { useState, useEffect } from "react";

const TimeSince = ({ startTime }: { startTime: number }) => {
  const [timePassed, setTimePassed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = new Date().getTime();
      const passedMs = currentTime - startTime;
      setTimePassed(Math.floor(passedMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTimePassed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${remainingSeconds}`;
  };

  return <>{formatTimePassed(timePassed)}</>;
};

export default TimeSince;
