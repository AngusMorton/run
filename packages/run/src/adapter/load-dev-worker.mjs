import { createServer } from "vite";

let activeDevServers;

process
  .on("message", (message) => {
    switch (message.type) {
      case "start":
        return start(message.entry, message.config);
      case "shutdown":
        return shutdown();
    }
  })
  .send("ready");

async function start(entry, config) {
  let changed = false;
  const loader = await createServer(config);
  ({ activeDevServers } = await loader.ssrLoadModule("@marko/run/adapter"));
  await loader.ssrLoadModule(entry);

  loader.watcher.on("change", (path) => {
    if (!changed && loader.moduleGraph.getModulesByFile(path)) {
      changed = true;
      process.send("restart");
    }
  });
}

function shutdown() {
  if (activeDevServers) {
    for (const devServer of activeDevServers) {
      devServer.ws.send({ type: "full-reload" });
    }
    activeDevServers.clear();
  }
}
