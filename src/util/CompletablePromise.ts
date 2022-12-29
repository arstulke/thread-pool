export type CompletablePromiseStatus = "waiting" | "resolved" | "rejected";

export class CompletablePromise<T> {
  private status: CompletablePromiseStatus = "waiting";

  private resolve: (t: T) => void = () => {
    throw new Error("CompletablePromise is not yet initialized");
  };
  private reject: (err: any) => void = () => {
    throw new Error("CompletablePromise is not yet initialized");
  };
  public readonly promise: Promise<T>;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  complete(t: T) {
    if (this.status !== "waiting") return;

    this.status = "resolved";
    this.resolve(t);
  }

  throw(err: any) {
    if (this.status !== "waiting") return;

    this.status = "rejected";
    this.reject(err);
  }

  get isWaiting(): boolean {
    return this.status === "waiting";
  }

  get isResolved(): boolean {
    return this.status === "resolved";
  }

  get isRejected(): boolean {
    return this.status === "rejected";
  }
}
