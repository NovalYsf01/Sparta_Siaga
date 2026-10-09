if (process.platform === "win32" && typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}

const preloadOption = `--require=${__filename}`;
if (!(process.env.NODE_OPTIONS || "").includes(preloadOption)) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, preloadOption]
    .filter(Boolean)
    .join(" ");
}
