import { WorkerThread } from "../../mod.ts";

class CustomWorker extends Worker {
  constructor() {
    super(new URL("./worker.ts", import.meta.url), { type: "module" });
  }
}

const thread = await new WorkerThread(CustomWorker)
  .started();

const result = await thread.run("square", 5);
console.log(result);

await thread.completed();
await thread.terminate();
