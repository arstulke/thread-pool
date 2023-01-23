import { log, sleep, waitBusy } from "../utils.ts";
import { exposeSingleFunction } from "../../mod.ts";

export interface TaskInput {
  id: number;
  arrivalTime: string;
}

export interface TaskOutput {
  id: number;
  arrivalTime: string;
  startTime: string;
  endTime: string;
}

const waitTime = 200;

async function simulateWork(taskInput: TaskInput): Promise<TaskOutput> {
  const { id, arrivalTime } = taskInput;

  sleep(waitTime / 2)
    .then(() => log("worker: after timeout"));

  const start = new Date();
  log("worker: before busy-waiting");

  waitBusy(waitTime); // simulating blocking task for 200ms

  log("worker: after busy-waiting");
  const end = new Date();

  return {
    id,
    arrivalTime,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  } as TaskOutput;
}

exposeSingleFunction(simulateWork, "simulateWork");
