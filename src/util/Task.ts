import { CompletablePromise } from "./CompletablePromise.ts";

export class Task<In, Out> extends CompletablePromise<Out> {
  constructor(
    public readonly taskName: string,
    public readonly taskInput: In,
  ) {
    super();
  }
}
