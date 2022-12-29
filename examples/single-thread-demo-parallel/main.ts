import { createWorkerThread } from "../../mod.ts";
import { log, sleep } from "../utils.ts";

const thread = await createWorkerThread(
  new URL("./worker.ts", import.meta.url),
);

const taskPromise = thread.simulateWork({
  id: 0,
  arrivalTime: new Date().toISOString(),
});

sleep(100)
  .then(() => log("main: after timeout"));

const result = await taskPromise;
console.log(result);

await thread.completed();
await thread.terminate();
