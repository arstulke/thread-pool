import { log, sleep, waitBusy } from "../utils.ts";
import { exposeSingleFunction } from "../../mod.ts";

export interface TaskInput {
  id: number;
  waitTime: number;
  arrivalTime: string;
}

export interface TaskOutput {
  id: number;
  waitTime: number;
  arrivalTime: string;
  startTime: string;
  endTime: string;
}

async function simulateWork(taskInput: TaskInput): Promise<TaskOutput> {
  const { id, waitTime, arrivalTime } = taskInput;

  const start = new Date();
  log("worker: before busy-waiting");

  waitBusy(waitTime); // simulating blocking task for 200ms

  log("worker: after busy-waiting");
  const end = new Date();

  return {
    id,
    waitTime,
    arrivalTime,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  } as TaskOutput;
}

exposeSingleFunction(simulateWork, "simulateWork");
