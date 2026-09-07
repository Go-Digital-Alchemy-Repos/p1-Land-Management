import type { Server } from "node:http";
import type { Socket, ListenOptions } from "node:net";
import type { RequestHandler } from "express";

export interface StoppableWorker {
  /** Prevent new work immediately; resolve only when in-flight work settles. */
  stop(): Promise<void>;
}

/** Serial polling with explicit drainage, not cancellation of the current promise. */
export function startStoppableWorker(options: {
  intervalMs: number;
  run: (isStopping: () => boolean) => Promise<void | number>;
  onError: (error: unknown) => void;
  unref?: boolean;
}): StoppableWorker {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = Promise.resolve();
  const run = () => {
    if (stopped) return;
    timer = undefined;
    active = Promise.resolve().then(async () => {
      if (stopped) return;
      let delay = options.intervalMs;
      try {
        const next = await options.run(() => stopped);
        if (typeof next === "number") delay = next;
      } catch (error) {
        try {
          options.onError(error);
        } catch {
          /* Reporting must not break drainage or leave a rejected worker promise. */
        }
      } finally {
        if (!stopped) {
          timer = setTimeout(run, delay);
          if (options.unref) timer.unref();
        }
      }
    });
  };
  // Assign the promise before invoking user work, including synchronous stop calls.
  run();
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      return active;
    },
  };
}

export function shutdownTimeoutMs(value: string | undefined): number {
  if (value === undefined) return 30_000;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 300_000) {
    throw new Error("SHUTDOWN_TIMEOUT_MS must be an integer between 1000 and 300000");
  }
  return parsed;
}

type SignalSource = {
  on(signal: "SIGTERM" | "SIGINT", listener: () => void): unknown;
  off(signal: "SIGTERM" | "SIGINT", listener: () => void): unknown;
};

export function createRuntimeLifecycle(options: {
  server: Server;
  closeDatabase: () => Promise<void>;
  timeoutMs: number;
  exit: (code: number) => void;
  onEvent?: (event: "draining" | "drained" | "failed" | "timeout", reason: string) => void;
}) {
  let stopping = false;
  let forced = false;
  let startup: Promise<unknown> = Promise.resolve();
  let shutdownPromise: Promise<void> | undefined;
  let disposeSignals = () => {};
  const sockets = new Set<Socket>();
  const workers: { worker: StoppableWorker; drain?: Promise<void> }[] = [];
  options.server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  const report = (event: "draining" | "drained" | "failed" | "timeout", reason: string) => {
    try {
      options.onEvent?.(event, reason);
    } catch {
      /* Telemetry must not prevent shutdown. */
    }
  };
  const stop = (entry: (typeof workers)[number]) => {
    if (!entry.drain) {
      try {
        entry.drain = entry.worker.stop();
      } catch (error) {
        entry.drain = Promise.reject(error);
      }
      // Register a rejection observer immediately; shutdown gathers its outcome.
      void entry.drain.catch(() => {});
    }
    return entry.drain;
  };
  const admission: RequestHandler = (_req, res, next) => {
    if (stopping) {
      res.setHeader("Connection", "close");
      res.status(503).json({ status: "not_ready", reason: "shutting_down" });
      return;
    }
    next();
  };

  const shutdown = (reason: string): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    let resolveShutdown!: () => void;
    shutdownPromise = new Promise<void>((resolve) => {
      resolveShutdown = resolve;
    });
    stopping = true;
    report("draining", reason);
    workers.forEach(stop);
    const httpClosed = new Promise<void>((resolve, reject) => {
      options.server.close((error?: Error) => {
        if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING")
          reject(error);
        else resolve();
      });
      options.server.closeIdleConnections();
    });
    const startupAndHttp = Promise.allSettled([startup, httpClosed]);
    let deadline!: ReturnType<typeof setTimeout>;
    const timeout = new Promise<void>((resolve) => {
      deadline = setTimeout(() => {
        forced = true;
        report("timeout", reason);
        // server.closeAllConnections omits upgraded sockets; track all accepted sockets.
        for (const socket of sockets) socket.destroy();
        disposeSignals();
        options.exit(1);
        resolve();
      }, options.timeoutMs);
    });
    const drain = (async () => {
      const initial = await startupAndHttp;
      // Startup may register resources after the signal; registration stops them
      // immediately, and this second snapshot waits for their real work too.
      const workerResults = await Promise.allSettled(workers.map(stop));
      if (forced) return;
      let failed = [...initial, ...workerResults].some((result) => result.status === "rejected");
      try {
        await options.closeDatabase();
      } catch {
        failed = true;
      }
      if (forced) return;
      clearTimeout(deadline);
      disposeSignals();
      report(failed ? "failed" : "drained", reason);
      options.exit(failed ? 1 : 0);
    })();
    void Promise.race([drain, timeout]).then(resolveShutdown);
    return shutdownPromise;
  };
  return {
    admission,
    listen(listenOptions: ListenOptions): Promise<void> {
      if (stopping) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        options.server.once("error", reject);
        options.server.listen(listenOptions, () => {
          options.server.off("error", reject);
          resolve();
        });
      });
    },
    isStopping: () => stopping,
    trackStartup(promise: Promise<unknown>) {
      startup = promise;
    },
    register(worker: StoppableWorker | undefined) {
      if (!worker) return;
      const entry = { worker };
      workers.push(entry);
      if (stopping) stop(entry);
    },
    installSignalHandlers(source: SignalSource) {
      const term = () => {
        void shutdown("SIGTERM");
      };
      const interrupt = () => {
        void shutdown("SIGINT");
      };
      source.on("SIGTERM", term);
      source.on("SIGINT", interrupt);
      disposeSignals = () => {
        source.off("SIGTERM", term);
        source.off("SIGINT", interrupt);
      };
      return disposeSignals;
    },
    shutdown,
  };
}
