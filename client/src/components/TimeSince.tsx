import { useState, useEffect } from "react";

const TimeSince = ({ startTime }: { startTime: Date }) => {
  const [timePassed, setTimePassed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = new Date().getTime();
      const passedMs = currentTime - startTime.getTime();
      setTimePassed(Math.floor(passedMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTimePassed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes}:${remainingSeconds}s`;
  };

  return <>Time passed: {formatTimePassed(timePassed)}</>;
};

export default TimeSince;
