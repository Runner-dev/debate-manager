const formatTime = (time: number) => {
  const seconds = time % 60;
  const minutes = (time - seconds) / 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export default formatTime;
