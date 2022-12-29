export type WebWorkerMessage = IdleMessage | TaskResultMessage<any>;

export interface StartedMessage {
  type: "STARTED";
  setup: {
    availableTaskNames: string[];
  };
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
