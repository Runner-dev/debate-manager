const calculateCurrentTimerValue = ({
  lastValue,
  playedAt,
}: {
  playedAt: Date | null;
  lastValue: number;
}) =>
  Math.round(
    Math.max(
      !!playedAt
        ? lastValue - (Date.now() - (playedAt?.getTime() || 0)) / 1000
        : lastValue,
      0
    )
  );

  export default calculateCurrentTimerValue
