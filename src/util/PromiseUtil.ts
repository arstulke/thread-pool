import { CompletablePromise } from "./CompletablePromise.ts";

export async function raceX<T>(
  promises: Promise<T>[],
  count: number,
): Promise<T[]> {
  const finishedCompletablePromise = new CompletablePromise<void>();

  const results: T[] = [];

  promises.forEach(async (promise) => {
    let result;
    try {
      result = await promise;
    } catch (err) {
      result = err;
    }

    if (results.length >= count) {
      finishedCompletablePromise.complete();
      return;
    }
    results.push(result);

    if (results.length >= count) {
      finishedCompletablePromise.complete();
      return;
    }
  });

  await finishedCompletablePromise.promise;
  return results;
}
