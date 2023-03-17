import { WorkerThread } from "../../mod.ts";
import { log, sleep } from "../utils.ts";

class CustomWorker extends Worker {
  constructor() {
    super(new URL("./worker.ts", import.meta.url), { type: "module" });
  }
}

const thread = await new WorkerThread(CustomWorker)
  .started();

const taskPromise = thread.run("simulateWork", {
  id: 0,
  arrivalTime: new Date().toISOString(),
});

sleep(100)
  .then(() => log("main: after timeout"));

const result = await taskPromise;
console.log(result);

await thread.completed();
await thread.terminate();
