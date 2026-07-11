import fs from "node:fs";

const originalRmSync = fs.rmSync.bind(fs);

fs.rmSync = (target, options = {}) => {
  const targetPath = String(target);
  if (!targetPath.includes("geoai-responsive-chrome-")) {
    return originalRmSync(target, options);
  }

  try {
    return originalRmSync(target, {
      ...options,
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 250
    });
  } catch (error) {
    console.warn(`Non-blocking Chrome profile cleanup warning: ${error.message}`);
    return undefined;
  }
};

await import("./responsive-visual-qa.mjs");
