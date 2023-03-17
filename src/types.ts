export type WebWorkerMessage =
  | StartedMessage
  | IdleMessage
  | TaskResultMessage<any>;

export interface StartedMessage {
  type: "STARTED";
}

export interface IdleMessage {
  type: "IDLE";
}

export interface TaskResultMessage<Output> {
  type: "TASK_RESULT";
  taskResultType: "success" | "error";
  taskOutput: Output;
}

export type MainThreadMessage = RunTaskMessage<any>;

export interface RunTaskMessage<Input> {
  type: "RUN_TASK";
  taskName: string;
  taskInput: Input;
}

export type WorkerConstructor = new () => Worker;
