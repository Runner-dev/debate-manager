const isDev = () => {
  if (typeof window !== "undefined") {
    if (location.hostname.includes("localhost")) return true;
    return false;
  }
  return false;
};

export default isDev;
