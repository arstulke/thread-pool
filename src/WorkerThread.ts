import { InternalWorkerThread } from "./InternalWorkerThread.ts";
import { BlockingQueue } from "./util/BlockingQueue.ts";
import { Task } from "./util/Task.ts";

export type TypedWorkerThread<T> = T & IWorkerThread;

type IWorkerThread = {
  run<In, Out>(taskName: string, input: In): Promise<Out>;
  started(): Promise<void>;
  completed(): Promise<void>;
  terminate(gracefully?: boolean): Promise<void>;
  availableTaskNames: string[];
};

class WorkerThread extends InternalWorkerThread implements IWorkerThread {
  availableTaskNames: string[];

  constructor(workerScriptURL: URL) {
    const taskQueue = new BlockingQueue<Task<any, any>>();
    super(workerScriptURL, taskQueue);
  }

  run<In, Out>(taskName: string, input: In): Promise<Out> {
    const task = new Task<In, Out>(taskName, input);
    this.taskQueue.push(task);
    return task.promise;
  }

  async started(): Promise<void> {
    this.availableTaskNames = await this.internalStarted();
  }

  async completed(): Promise<void> {
    await super.internalCompleted(true);
  }

  async terminate(gracefully: boolean = true): Promise<void> {
    await this.taskQueue.close(gracefully);
    await super.internalTerminate(true, gracefully);
  }
}

export async function createWorkerThread<T>(
  workerScriptURL: URL,
): Promise<TypedWorkerThread<T>> {
  const workerThread = new WorkerThread(workerScriptURL);
  await workerThread.started();

  // assign functions for available tasks
  const unknownWorkerThread = workerThread as any;
  for (const taskName of workerThread.availableTaskNames) {
    unknownWorkerThread[taskName] = (input: any) =>
      workerThread.run(taskName, input);
  }

  return unknownWorkerThread as TypedWorkerThread<T>;
}
