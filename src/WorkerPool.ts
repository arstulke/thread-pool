import { Task } from "./util/Task.ts";
import { BlockingQueue } from "./util/BlockingQueue.ts";
import { InternalWorkerThread } from "./InternalWorkerThread";

export type TypedWorkerPool<T> = T & IWorkerPool;

interface IWorkerPool {
  scaleTo(targetSize: number): Promise<void>;
  run<In, Out>(taskName: string, input: In): Promise<Out>;
  started(): Promise<void>;
  completed(): Promise<void>;
  terminate(gracefully?: boolean): Promise<void>;
  availableTaskNames: string[];
}

class WorkerPool implements IWorkerPool {
  private readonly workerThreads: InternalWorkerThread[] = [];
  private readonly taskQueue = new BlockingQueue<Task<any, any>>();
  availableTaskNames: string[] = [];

  constructor(private readonly workerScriptURL: URL) {
    // TODO implement availableTaskNames = ...
  }

  async scaleTo(targetSize: number): Promise<void> {
    const oldSize = this.runningCount;
    if (oldSize < targetSize) {
      await this.scaleUp(oldSize, targetSize);
    } else if (oldSize > targetSize) {
      await this.scaleDown(oldSize, targetSize);
    }
  }

  async scaleUp(oldSize: number, targetSize: number): Promise<void> {
    // TODO implement scaleUp
  }

  async scaleDown(oldSize: number, targetSize: number): Promise<void> {
    // TODO implement scaleDown
  }

  run<In, Out>(taskName: string, input: In): Promise<Out> {
    const task = new Task<In, Out>(taskName, input);
    this.taskQueue.push(task);
    return task.promise;
  }

  private get runningCount(): number {
    return 0; // TODO implement runningCount
  }

  async started(): Promise<void> {
    if (this.runningCount > 0) return;

    await this.scaleTo(1);
  }

  async completed(): Promise<void> {
    await this.taskQueue.completed();

    const workerThreadPromises = this.workerThreads
      .map((wt: InternalWorkerThread) => wt.internalCompleted(true));
    await Promise.all(workerThreadPromises);
  }

  async terminate(gracefully: boolean = true): Promise<void> {
    await this.taskQueue.close(gracefully);

    const workerThreadPromises = this.workerThreads
      .map((wt: InternalWorkerThread) =>
        wt.internalTerminate(true, gracefully)
      );
    await Promise.all(workerThreadPromises);
  }
}

export async function createWorkerPool<T>(
  workerScriptURL: URL,
): Promise<TypedWorkerPool<T>> {
  const workerPool = new WorkerPool(workerScriptURL);
  await workerPool.started();

  // assign functions for available tasks
  const unknownWorkerPool = workerPool as any;
  for (const taskName of workerPool.availableTaskNames) {
    unknownWorkerPool[taskName] = (input: any) =>
      workerPool.run(taskName, input);
  }

  return unknownWorkerPool as TypedWorkerPool<T>;
}
