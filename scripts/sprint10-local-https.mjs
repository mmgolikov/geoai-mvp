// Loopback-only test harness for the optimized build; not the deployment server.
// A disposable self-signed certificate is trusted only by the dedicated test
// context. No OS/browser trust-store install or product CSP modification occurs.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:https";
import next from "next";

if (process.env.NODE_ENV !== "production") throw new Error("Use an optimized production build and NODE_ENV=production");
const directory = await mkdtemp(join(tmpdir(), "geoai-sprint10-test-tls-"));
const key = join(directory, "localhost.key");
const cert = join(directory, "localhost.crt");
try {
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1",
    "-keyout", key, "-out", cert
  ], { stdio: "ignore" });
  const app = next({ dev: false, hostname: "127.0.0.1", port: 3443 });
  await app.prepare();
  const server = createServer({ key: await readFile(key), cert: await readFile(cert) }, app.getRequestHandler());
  server.on("upgrade", app.getUpgradeHandler());
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.closeAllConnections();
    server.close();
    await app.close();
    await rm(directory, { recursive: true, force: true });
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  server.on("error", async (error) => {
    console.error(error.message);
    await rm(directory, { recursive: true, force: true });
    process.exit(1);
  });
  server.listen(3443, "127.0.0.1", () => console.log("Local optimized HTTPS test server: https://127.0.0.1:3443"));
} catch (error) {
  await rm(directory, { recursive: true, force: true });
  throw error;
}
