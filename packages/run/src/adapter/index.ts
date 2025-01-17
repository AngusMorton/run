import path from "path";
import { fileURLToPath } from "url";
import type { Address, Worker } from "cluster";
import type { Adapter } from "../vite";
import { createDevServer } from "./dev-server";
import type { AddressInfo } from "net";
import {
  loadEnv,
  spawnServer,
  type SpawnedServer,
  spawnServerWorker,
} from "../vite/utils/server";

export {
  activeDevServers,
  createDevServer,
  createViteDevServer,
  createViteDevMiddleware,
} from "./dev-server";
export type { Adapter, SpawnedServer };
export type { NodePlatformInfo } from "./middleware";

// @ts-expect-error
import parseNodeArgs from "parse-node-args";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const defaultEntry = path.join(__dirname, "default-entry");
const loadDevWorker = path.join(__dirname, "load-dev-worker.mjs");

export default function adapter(): Adapter {
  return {
    name: "base-adapter",

    async getEntryFile() {
      return defaultEntry;
    },

    async startDev(entry, config, options) {
      const { port = 3000, envFile } = options;

      if (entry) {
        const { nodeArgs } = parseNodeArgs(options.args);
        let worker: Worker;

        async function start() {
          const nextWorker = await spawnServerWorker(
            loadDevWorker,
            nodeArgs,
            port,
            envFile
          );

          nextWorker
            .on("message", (messsage) => {
              if (messsage === "restart") {
                start();
              }
            })
            .send({ type: "start", entry, config });

          await waitForWorker(nextWorker, port);

          if (worker) {
            const prevWorker = worker;
            let timeout: any;
            worker.once("disconnect", () => {
              clearTimeout(timeout);
            });
            worker.send({ type: "shutdown" });
            worker.disconnect();
            timeout = setTimeout(() => {
              prevWorker.kill();
            }, 2000);
          }

          worker = nextWorker;
        }

        await start();

        return {
          port,
          close() {
            worker.kill();
          },
        };
      }

      const devServer = await createDevServer(config);
      envFile && (await loadEnv(envFile));

      return new Promise<SpawnedServer>((resolve) => {
        const listener = devServer.middlewares.listen(port, () => {
          const address = listener.address() as AddressInfo;
          console.log(`Dev server started: http://localhost:${address.port}`);
          resolve({
            port,
            async close() {
              await devServer.close();
            },
          });
        });
      });
    },

    async startPreview(entry, options) {
      const { port = 3000, envFile } = options;
      const { nodeArgs } = parseNodeArgs(options.args);
      const args = [...nodeArgs, entry];
      const server = await spawnServer("node", args, port, envFile);
      console.log(`Preview server started: http://localhost:${server.port}`);
      return server;
    },
  };
}

async function waitForWorker(worker: Worker, port: number) {
  return new Promise<void>((resolve) => {
    function listening(address: Address) {
      if (address.port === port) {
        worker.off("listening", listening);
        resolve();
      }
    }
    worker.on("listening", listening);
  });
}
