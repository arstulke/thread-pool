import {
  MainThreadMessage,
  RunTaskMessage,
  TaskResultMessage,
  WebWorkerMessage,
} from "./types.ts";
import { CompletablePromise } from "./util/CompletablePromise.ts";

type WorkerTaskFunction<In = any, Out = any> = (input: In) => Promise<Out>;
type WorkerTaskObject = { [key: string]: WorkerTaskFunction<any, any> };

export function exposeSingleFunction<In, Out>(
  fn: WorkerTaskFunction<In, Out>,
  name: string = "default",
) {
  exposeMultipleFunctions({ [name]: fn });
}

export function exposeMultipleFunctions(
  fnObj: WorkerTaskObject,
) {
  let currentAbortCompletable: CompletablePromise<void> =
    new CompletablePromise<void>();

  function sendMessage(msg: WebWorkerMessage): void {
    self.postMessage(msg);
  }

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
          sendMessage(resultMessage);
        }
        sendMessage({ type: "IDLE" });
        break;
    }
  };

  sendMessage({ type: "STARTED" });
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
