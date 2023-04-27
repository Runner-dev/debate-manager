import { useEffect, useState } from "react";
import calculateCurrentTimerValue from "~/utils/calculateCurrentTimerValue";
import formatTime from "~/utils/formatTime";

const useTimer = ({
  lastValue,
  playedAt,
}: {
  lastValue: number;
  playedAt: Date | null;
}) => {
  const playing = !!playedAt;
  const [currentValue, setCurrentValue] = useState(
    calculateCurrentTimerValue({
      playedAt,
      lastValue,
    })
  );

  useEffect(() => {
    setCurrentValue(
      calculateCurrentTimerValue({
        playedAt,
        lastValue,
      })
    );

    if (!playing) return;
    const effect = () => {
      setCurrentValue(
        calculateCurrentTimerValue({
          lastValue,
          playedAt,
        })
      );
    };

    const interval = setInterval(effect, 500);

    return () => {
      clearInterval(interval);
    };
  }, [playedAt, lastValue, playing]);

  const formattedCurrentValue = formatTime(currentValue);

  return {
    currentValue,
    formattedCurrentValue,
    playing,
  };
};

export default useTimer;
