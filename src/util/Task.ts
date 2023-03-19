import { CompletablePromise } from "./CompletablePromise.ts";

export class CanceledWaitingTaskError extends Error {
  public readonly canceledWaiting = true;

  constructor() {
    super("Task was canceld and deleted from waiting queue");
  }
}

export class Task<In, Out> extends CompletablePromise<Out> {
  constructor(
    public readonly taskName: string,
    public readonly taskInput: In,
  ) {
    super();
  }

  cancelWaiting(): void {
    this.throw(new CanceledWaitingTaskError());
  }
}
