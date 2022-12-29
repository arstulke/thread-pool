import { createWorkerThread } from "../../mod.ts";

const thread = await createWorkerThread(
  new URL("./worker.ts", import.meta.url),
);

const result = await thread.square(5);
console.log(result);

await thread.completed();
await thread.terminate();
