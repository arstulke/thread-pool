export function waitBusy(waitTime: number): void {
  const start = Date.now();
  const end = start + waitTime;
  let currentTime = Date.now();
  while (currentTime < end) {
    currentTime = Date.now();
  }
}

export function sleep(waitTime: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), waitTime);
  });
}

export function log(...args: any[]) {
  console.log(new Date().toISOString(), ...args);
}
