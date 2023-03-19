import {
  InternalWorkerThread,
  WorkerConstructor,
} from "./InternalWorkerThread.ts";
import { BlockingQueue, BlockingQueueOptions } from "./util/BlockingQueue.ts";
import { Task } from "./util/Task.ts";

interface IWorkerThread {
  run<In, Out>(taskName: string, input: In): Promise<Out>;
  started(): Promise<this>;
  completed(): Promise<this>;
  terminate(gracefully?: boolean): Promise<void>;
}

export interface WorkerThreadOptions extends BlockingQueueOptions {}

export class WorkerThread extends InternalWorkerThread
  implements IWorkerThread {
  constructor(
    workerConstructor: WorkerConstructor,
    options?: WorkerThreadOptions,
  ) {
    const taskQueue = new BlockingQueue<Task<any, any>>({
      maxWaitingValues: options?.maxWaitingValues,
      deleteWaitingValueAction: options?.deleteWaitingValueAction,
      onDeletedWaitingValue: (task: Task<any, any>) =>
        task.throw(new Error("Task was deleted from waiting queue")),
    });
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
