import { useMemo } from "react";
import useTimer from "~/hooks/useTimer";
import formatTime from "~/utils/formatTime";

const Timer = ({
  totalTime,
  lastValue,
  playedAt,
  buttons,
}: {
  totalTime: number;
  lastValue: number;
  playedAt: Date | null;
  buttons:
    | React.ReactNode
    | ((timerData: { playing: boolean }) => React.ReactNode);
}) => {
  const { formattedCurrentValue, playing } = useTimer({
    lastValue,
    playedAt,
  });

  const formattedTotalTime = useMemo(() => formatTime(totalTime), [totalTime]);

  const children =
    typeof buttons === "function" ? buttons({ playing }) : buttons;

  return (
    <>
      <div className="h-min flex-1 flex-grow-0 rounded-lg bg-gray-100 py-8 text-center text-6xl font-bold">
        {formattedCurrentValue} / {formattedTotalTime}
      </div>
      {buttons && <div className="flex w-full gap-2">{children}</div>}
    </>
  );
};

export default Timer;
