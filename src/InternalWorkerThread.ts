import { Task } from "./util/Task.ts";
import {
  BlockingQueue,
  BlockingQueueClosedError,
} from "./util/BlockingQueue.ts";
import { CompletablePromise } from "./util/CompletablePromise.ts";
import { RunTaskMessage, StartedMessage, WebWorkerMessage } from "./types.ts";

type Status = "starting" | "idling" | "working";

export class InternalWorkerThread {
  private readonly webWorker: Worker;

  private status: Status = "starting";
  private startedCompletable: CompletablePromise<StartedMessage["setup"]> =
    new CompletablePromise<
      StartedMessage["setup"]
    >();

  protected _availableTaskNames: string[] = [];

  private currentTask: Task<any, any> | null = null;

  constructor(
    workerScriptURL: URL,
    protected readonly taskQueue: BlockingQueue<Task<any, any>>,
  ) {
    this.webWorker = new Worker(workerScriptURL.href, { type: "module" });

    this.webWorker.onmessage = async (
      event: MessageEvent<WebWorkerMessage>,
    ) => {
      const { data: message } = event;

      switch (message.type) {
        case "STARTED":
          this.startedCompletable.complete(message.setup);
        case "IDLE":
          this.status = "idling";
          this.runNextTask();
          break;

        case "TASK_RESULT":
          this.currentTask?.complete(message.taskOutput!);
          break;
      }
    };
  }

  private async runNextTask(): Promise<void> {
    let task: Task<any, any>;
    try {
      task = await this.taskQueue.pull();
    } catch (err) {
      if (err instanceof BlockingQueueClosedError) {
        return;
      }
      throw err;
    }

    this.currentTask = task;
    this.status = "working";

    const { taskName, taskInput } = task;
    const msg: RunTaskMessage<any> = { type: "RUN_TASK", taskName, taskInput };
    this.webWorker.postMessage(msg);
  }

  async internalStarted(): Promise<string[]> {
    const { availableTaskNames } = await this.startedCompletable.promise;
    return availableTaskNames;
  }

  async internalCompleted(waitForEmptyQueue: boolean): Promise<void> {
    if (waitForEmptyQueue) {
      await this.taskQueue.completed();
    }
    await this.currentTask?.promise;
  }

  async internalTerminate(
    waitForEmptyQueue: boolean,
    gracefully: boolean = true,
  ): Promise<void> {
    if (gracefully) {
      await this.internalCompleted(waitForEmptyQueue);
    }

    this.webWorker.terminate();
  }

  get availableTaskNames(): string[] {
    return this._availableTaskNames.slice();
  }
}
