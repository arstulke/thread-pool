import { WorkerPool } from "../../mod.ts";
import { sleep } from "../utils.ts";

const pool = await new WorkerPool(new URL("./worker.ts", import.meta.url))
  .started();
await pool.scaleTo(2);

const taskPromise1 = pool.run("simulateWork", {
  id: 0,
  waitTime: 3000,
  arrivalTime: new Date().toISOString(),
});

const taskPromise2 = pool.run("simulateWork", {
  id: 1,
  waitTime: 5000,
  arrivalTime: new Date().toISOString(),
});

await sleep(10); // required for scheduling the tasks
const scalePromise = pool.scaleTo(1);
const taskPromise3 = pool.run("simulateWork", {
  id: 2,
  waitTime: 7000,
  arrivalTime: new Date().toISOString(),
});
await scalePromise;

const result1 = await taskPromise1;
console.log(result1);

const result2 = await taskPromise2;
console.log(result2);

const result3 = await taskPromise3;
console.log(result3);

await pool.completed();
await pool.terminate();
