import { Task } from "./util/Task.ts";
import { BlockingQueue, BlockingQueueOptions } from "./util/BlockingQueue.ts";
import {
  InternalWorkerThread,
  WorkerConstructor,
} from "./InternalWorkerThread.ts";
import { raceX } from "./util/PromiseUtil.ts";

interface IWorkerPool {
  scaleTo(targetSize: number): Promise<this>;
  run<In, Out>(taskName: string, input: In): Promise<Out>;
  started(): Promise<this>;
  completed(): Promise<this>;
  terminate(gracefully?: boolean): Promise<void>;
}

export interface WorkerPoolOptions extends BlockingQueueOptions {}

export class WorkerPool implements IWorkerPool {
  private readonly workerThreads: InternalWorkerThread[] = [];
  private readonly taskQueue: BlockingQueue<Task<any, any>>;

  constructor(
    private readonly workerConstructor: WorkerConstructor,
    options?: WorkerPoolOptions,
  ) {
    this.taskQueue = new BlockingQueue<Task<any, any>>({
      maxWaitingValues: options?.maxWaitingValues,
      deleteWaitingValueAction: options?.deleteWaitingValueAction,
      onDeletedWaitingValue: (task: Task<any, any>) => task.cancelWaiting(),
    });
  }

  async scaleTo(targetSize: number): Promise<this> {
    const oldSize = this.runningCount;
    console.log(`Scaling from ${oldSize} to ${targetSize}...`);
    if (oldSize < targetSize) {
      await this.scaleUp(oldSize, targetSize);
      console.log(`Scaled up to ${targetSize}`);
    } else if (oldSize > targetSize) {
      await this.scaleDown(oldSize, targetSize);
      console.log(`Scaled down to ${targetSize}`);
    } else {
      console.log(`Scaled already to ${targetSize}. No action required`);
    }

    return this;
  }

  protected async scaleUp(oldSize: number, targetSize: number): Promise<void> {
    const startedPromises: Promise<void>[] = [];
    for (let i = oldSize; i < targetSize; i++) {
      const workerThread = new InternalWorkerThread(
        this.workerConstructor,
        this.taskQueue,
      );
      this.workerThreads.push(workerThread);

      startedPromises.push(workerThread.internalStarted());
    }

    await Promise.all(startedPromises);
  }

  protected async scaleDown(
    oldSize: number,
    targetSize: number,
  ): Promise<void> {
    this.taskQueue.pause();

    // pause queue
    const runningThreads = [
      ...this.workerThreads.filter((wt) => wt.isStarting),
      ...this.workerThreads.filter((wt) => wt.isIdling),
      ...this.workerThreads.filter((wt) => wt.isWorking),
    ];
    // runningThreads.length === oldSize, so no check for size of runningThreads array

    const completedPromises = runningThreads.map(async (wt) => {
      await wt.internalCompleted(false);
      return wt;
    });
    const threadCountToTerminate = oldSize - targetSize;
    const completedThreads = await raceX(
      completedPromises,
      threadCountToTerminate,
    );

    const terminatePromises = completedThreads.map((wt) =>
      wt.internalTerminate(false, true)
    );
    await Promise.all(terminatePromises);

    this.taskQueue.resume();
  }

  run<In, Out>(taskName: string, input: In): Promise<Out> {
    const task = new Task<In, Out>(taskName, input);
    this.taskQueue.push(task);
    return task.promise;
  }

  private get runningCount(): number {
    return this.workerThreads
      .filter((wt) => wt.isRunning)
      .length;
  }

  async started(): Promise<this> {
    if (this.runningCount > 0) return this;

    await this.scaleTo(1);
    return this;
  }

  async completed(): Promise<this> {
    await this.taskQueue.completed();

    const workerThreadPromises = this.workerThreads
      .map((wt: InternalWorkerThread) => wt.internalCompleted(true));
    await Promise.all(workerThreadPromises);

    return this;
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
