import { exposeSingleFunction } from "../../mod.ts";

async function square(taskInput: number): Promise<number> {
  return taskInput * taskInput;
}

exposeSingleFunction(square, "square");
