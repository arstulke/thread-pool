import { CompletablePromise } from "./CompletablePromise.ts";

export class BlockingQueueClosedError extends Error {
}

export class BlockingQueue<Value> {
  private readonly pullingCompletablePromiseBuffer: CompletablePromise<
    Value
  >[] = [];
  private readonly waitingValueBuffer: Value[] = [];

  private isClosing: boolean = false;
  private emptyCompletable: CompletablePromise<void> = new CompletablePromise<
    void
  >();

  private isPaused: boolean;
  private resumeCompletable: CompletablePromise<void> = new CompletablePromise<
    void
  >();

  constructor() {
    this.resumeCompletable.complete();
  }

  pause(): void {
    this.isPaused = true;
    if (this.resumeCompletable.isResolved) {
      this.resumeCompletable = new CompletablePromise<void>();
    }
  }

  resume(): void {
    const valueCountToAssign = Math.min(
      this.waitingValueBuffer.length,
      this.pullingCompletablePromiseBuffer.length,
    );

    for (let i = 0; i < valueCountToAssign; i++) {
      const value = this.waitingValueBuffer.shift()!;
      const completable = this.pullingCompletablePromiseBuffer.shift();
      completable.complete(value);
    }

    if (this.isEmpty) {
      this.emptyCompletable.complete();
    }

    this.isPaused = false;
    this.resumeCompletable.complete();
  }

  awaitResume(): Promise<void> {
    return this.resumeCompletable.promise;
  }

  push(value: Value): void {
    if (this.isClosing) {
      throw new BlockingQueueClosedError(
        "BlockingQueue is closed, cannot push more values",
      );
    }

    if (this.pullingCompletablePromiseBuffer.length === 0 || this.isPaused) { // if no promises are queued or queue is paused
      this.waitingValueBuffer.push(value); // queue the value
      return;
    }

    const completablePromise = this.pullingCompletablePromiseBuffer.shift();
    completablePromise!.complete(value);
  }

  async pull(): Promise<Value> {
    if (this.isEmpty || this.isPaused) {
      const completablePromise = new CompletablePromise<Value>();
      this.pullingCompletablePromiseBuffer.push(completablePromise);
      return completablePromise.promise;
    }

    const value = this.waitingValueBuffer.shift()!;
    if (this.isEmpty) {
      this.emptyCompletable.complete();
    }
    return value;
  }

  get isEmpty(): boolean {
    return this.waitingValueBuffer.length === 0;
  }

  async completed(): Promise<void> {
    if (this.isEmpty) return;

    if (this.emptyCompletable.isResolved) {
      this.emptyCompletable = new CompletablePromise<void>();
    }
    return this.emptyCompletable.promise;
  }

  async close(gracefully: boolean = true): Promise<void> {
    this.isClosing = true;

    if (gracefully) {
      await this.completed();
    }

    this.pullingCompletablePromiseBuffer.forEach(
      (p: CompletablePromise<Value>) => {
        p.throw(
          new BlockingQueueClosedError(
            "BlockingQueue was closed before retrieving another value",
          ),
        );
      },
    );
  }
}
