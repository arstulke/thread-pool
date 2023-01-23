import { WorkerThread } from "../../mod.ts";

const thread = await new WorkerThread(new URL("./worker.ts", import.meta.url))
  .started();

const result = await thread.run("square", 5);
console.log(result);

await thread.completed();
await thread.terminate();
