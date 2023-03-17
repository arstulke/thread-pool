import { InternalWorkerThread, WorkerConstructor } from "./InternalWorkerThread.ts";
import { BlockingQueue } from "./util/BlockingQueue.ts";
import { Task } from "./util/Task.ts";

interface IWorkerThread {
  run<In, Out>(taskName: string, input: In): Promise<Out>;
  started(): Promise<this>;
  completed(): Promise<this>;
  terminate(gracefully?: boolean): Promise<void>;
}

export class WorkerThread extends InternalWorkerThread
  implements IWorkerThread {
  constructor(workerConstructor: WorkerConstructor) {
    const taskQueue = new BlockingQueue<Task<any, any>>();
    super(workerConstructor, taskQueue);
  }

  run<In, Out>(taskName: string, input: In): Promise<Out> {
    const task = new Task<In, Out>(taskName, input);
    this.taskQueue.push(task);
    return task.promise;
  }

  async started(): Promise<this> {
    await this.internalStarted();
    return this;
  }

  async completed(): Promise<this> {
    await super.internalCompleted(true);
    return this;
  }

  async terminate(gracefully: boolean = true): Promise<void> {
    await this.taskQueue.close(gracefully);
    await super.internalTerminate(true, gracefully);
  }
}
