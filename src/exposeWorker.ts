import { StartedMessage } from "./types";
import {
  MainThreadMessage,
  RunTaskMessage,
  TaskResultMessage,
} from "./types.ts";
import { CompletablePromise } from "./util/CompletablePromise.ts";

type WorkerTaskFunction<In = any, Out = any> = (input: In) => Promise<Out>;
type WorkerTaskObject = { [key: string]: WorkerTaskFunction<any, any> };

export function exposeSingleFunction(
  fn: WorkerTaskFunction<any, any>,
  name: string = "default",
) {
  exposeMultipleFunctions({ [name]: fn });
}

export function exposeMultipleFunctions(
  fnObj: WorkerTaskObject,
) {
  let currentAbortCompletable: CompletablePromise<void> =
    new CompletablePromise<void>();

  self.onmessage = async (event: MessageEvent<MainThreadMessage>) => {
    const { data: message } = event;

    switch (message.type) {
      case "RUN_TASK":
        const taskPromise = runTask(message, fnObj);
        const abortCompletable = currentAbortCompletable =
          new CompletablePromise<void>();
        const resultMessage = await Promise.race([
          taskPromise,
          abortCompletable.promise,
        ]);
        if (resultMessage) {
          self.postMessage(resultMessage);
        }
        self.postMessage({ type: "IDLE" });
        break;
    }
  };

  const startedMessage: StartedMessage = {
    type: "STARTED",
    setup: { availableTaskNames: Object.keys(fnObj) },
  };
  self.postMessage(startedMessage);
}

async function runTask(
  message: RunTaskMessage<any>,
  fnObj: WorkerTaskObject,
): Promise<TaskResultMessage<any>> {
  const { taskName, taskInput } = message;
  const taskFn = fnObj[taskName];

  try {
    const taskOutput = await taskFn(taskInput);
    return { type: "TASK_RESULT", taskResultType: "success", taskOutput };
  } catch (err) {
    return { type: "TASK_RESULT", taskResultType: "error", taskOutput: err };
  }
}
