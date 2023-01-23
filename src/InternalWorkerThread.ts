import { RunTaskMessage, WebWorkerMessage } from "./types.ts";
import {
  BlockingQueue,
  BlockingQueueClosedError,
} from "./util/BlockingQueue.ts";
import { CompletablePromise } from "./util/CompletablePromise.ts";
import { Task } from "./util/Task.ts";

type Status = "starting" | "idling" | "working" | "terminating" | "terminated";

export class InternalWorkerThread {
  private readonly webWorker: Worker;

  private _status: Status = "starting";
  private startedCompletable: CompletablePromise<void> = new CompletablePromise<
    void
  >();

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
          this.startedCompletable.complete();
          this._status = "idling";
          this.runNextTask();
          break;
        case "IDLE":
          this._status = "idling";
          this.runNextTask();
          break;

        case "TASK_RESULT":
          this.currentTask?.complete(message.taskOutput!);
          break;
      }
    };
  }

  private async runNextTask(): Promise<void> {
    await this.taskQueue.awaitResume();
    if (this.isTerminating || this.isTerminated) {
      return;
    }

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
    this._status = "working";

    const { taskName, taskInput } = task;
    const msg: RunTaskMessage<any> = { type: "RUN_TASK", taskName, taskInput };
    this.webWorker.postMessage(msg);
  }

  async internalStarted(): Promise<void> {
    await this.startedCompletable.promise;
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
    this._status = "terminating";
    if (gracefully) {
      await this.internalCompleted(waitForEmptyQueue);
    }

    this.webWorker.terminate();
    this._status = "terminated";
  }

  get isStarting(): boolean {
    return this._status === "starting";
  }

  get isIdling(): boolean {
    return this._status === "idling";
  }

  get isWorking(): boolean {
    return this._status === "working";
  }

  get isTerminating(): boolean {
    return this._status === "terminating";
  }

  get isTerminated(): boolean {
    return this._status === "terminated";
  }

  get isRunning(): boolean {
    return this.isStarting || this.isIdling || this.isWorking;
  }
}
