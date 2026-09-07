import { createServer, request } from "node:http";
import { createConnection, type AddressInfo } from "node:net";
import { EventEmitter } from "node:events";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRuntimeLifecycle,
  startStoppableWorker,
  shutdownTimeoutMs,
} from "./runtime-lifecycle";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => vi.useRealTimers());

describe("stoppable workers", () => {
  it("waits for synchronous-stop initiated in-flight work and never polls again", async () => {
    vi.useFakeTimers();
    const entered = deferred();
    const release = deferred();
    let drained = false;
    const run = vi.fn(async (isStopping: () => boolean) => {
      void worker.stop().then(() => {
        drained = true;
      });
      expect(isStopping()).toBe(true);
      entered.resolve();
      await release.promise;
    });
    const worker = startStoppableWorker({ intervalMs: 10, run, onError: vi.fn() });
    await entered.promise;
    await vi.advanceTimersByTimeAsync(100);
    expect(drained).toBe(false);
    release.resolve();
    await worker.stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(drained).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("prevents overlapping polls and contains failing error reporters", async () => {
    vi.useFakeTimers();
    const release = deferred();
    const run = vi
      .fn()
      .mockImplementationOnce(() => release.promise)
      .mockRejectedValue(new Error("work failed"));
    const report = vi.fn(() => {
      throw new Error("logger failed");
    });
    const worker = startStoppableWorker({ intervalMs: 10, run, onError: report });
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(1);
    release.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(run).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledTimes(1);
    await worker.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("stops before its first invocation without starting work", async () => {
    const run = vi.fn();
    const worker = startStoppableWorker({ intervalMs: 10, run, onError: vi.fn() });
    await worker.stop();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("runtime shutdown", () => {
  it("rejects pipelined readiness during actual HTTP drainage and closes DB after HTTP and worker completion", async () => {
    const app = express();
    const server = createServer(app);
    const releaseHttp = deferred();
    const httpEntered = deferred();
    const releaseWorker = deferred();
    const workerEntered = deferred();
    const events: string[] = [];
    const exit = vi.fn();
    const closeDatabase = vi.fn(async () => {
      events.push("database_closed");
    });
    const runtime = createRuntimeLifecycle({ server, closeDatabase, timeoutMs: 2000, exit });
    const signals = new EventEmitter();
    runtime.installSignalHandlers(signals);
    app.use(runtime.admission);
    app.get("/slow", async (_req, res) => {
      httpEntered.resolve();
      await releaseHttp.promise;
      events.push("http_finished");
      res.send("done");
    });
    app.get("/api/health/ready", (_req, res) => res.json({ status: "ready" }));
    runtime.register(
      startStoppableWorker({
        intervalMs: 10,
        run: async () => {
          workerEntered.resolve();
          await releaseWorker.promise;
          events.push("worker_finished");
        },
        onError: vi.fn(),
      }),
    );
    await runtime.listen({ port: 0, host: "127.0.0.1" });
    const socket = createConnection((server.address() as AddressInfo).port, "127.0.0.1");
    let output = "";
    socket.on("data", (data) => {
      output += data.toString();
    });
    const closed = new Promise<void>((resolve, reject) => {
      socket.once("close", () => resolve());
      socket.once("error", reject);
    });
    socket.write("GET /slow HTTP/1.1\r\nHost: localhost\r\n\r\n");
    await Promise.all([httpEntered.promise, workerEntered.promise]);
    signals.emit("SIGTERM");
    const draining = runtime.shutdown("again");
    expect(runtime.shutdown("again")).toBe(draining);
    signals.emit("SIGINT");
    expect(runtime.isStopping()).toBe(true);
    socket.write("GET /api/health/ready HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
    expect(closeDatabase).not.toHaveBeenCalled();
    releaseHttp.resolve();
    await closed;
    expect(output).toContain("HTTP/1.1 200 OK");
    expect(output).toContain("HTTP/1.1 503 Service Unavailable");
    expect(output).toContain('"reason":"shutting_down"');
    expect(closeDatabase).not.toHaveBeenCalled();
    releaseWorker.resolve();
    await draining;
    expect(events).toEqual(["http_finished", "worker_finished", "database_closed"]);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(signals.listenerCount("SIGTERM")).toBe(0);
  });

  it("waits for startup and late resources but refuses to listen after a startup-time signal", async () => {
    const server = createServer();
    const releaseStartup = deferred();
    const releaseLateWorker = deferred();
    const closeDatabase = vi.fn(async () => {});
    const exit = vi.fn();
    const runtime = createRuntimeLifecycle({ server, closeDatabase, timeoutMs: 2000, exit });
    const startup = (async () => {
      await releaseStartup.promise;
      runtime.register({ stop: () => releaseLateWorker.promise });
      await runtime.listen({ port: 0, host: "127.0.0.1" });
    })();
    runtime.trackStartup(startup);
    const drain = runtime.shutdown("SIGTERM");
    releaseStartup.resolve();
    await startup;
    expect(server.listening).toBe(false);
    expect(closeDatabase).not.toHaveBeenCalled();
    releaseLateWorker.resolve();
    await drain;
    expect(closeDatabase).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it("forces a bounded nonzero exit and destroys an active socket without closing DB under active work", async () => {
    const entered = deferred();
    const releaseWorker = deferred();
    const server = createServer(() => {
      entered.resolve();
    });
    const closeDatabase = vi.fn(async () => {});
    const exit = vi.fn();
    const runtime = createRuntimeLifecycle({ server, closeDatabase, timeoutMs: 30, exit });
    runtime.register({ stop: () => releaseWorker.promise });
    await runtime.listen({ port: 0, host: "127.0.0.1" });
    const req = request({ hostname: "127.0.0.1", port: (server.address() as AddressInfo).port });
    const disconnected = new Promise<void>((resolve) => req.on("error", () => resolve()));
    req.end();
    await entered.promise;
    await runtime.shutdown("SIGTERM");
    await disconnected;
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(closeDatabase).not.toHaveBeenCalled();
    releaseWorker.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(closeDatabase).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("keeps the forced deadline active while pool shutdown itself hangs", async () => {
    vi.useFakeTimers();
    const release = deferred();
    const exit = vi.fn();
    const runtime = createRuntimeLifecycle({
      server: createServer(),
      closeDatabase: () => release.promise,
      timeoutMs: 30,
      exit,
    });
    const drain = runtime.shutdown("SIGINT");
    await vi.advanceTimersByTimeAsync(30);
    await drain;
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    release.resolve();
  });

  it("validates the configured shutdown deadline", () => {
    expect(shutdownTimeoutMs(undefined)).toBe(30_000);
    expect(shutdownTimeoutMs("60000")).toBe(60_000);
    expect(() => shutdownTimeoutMs("0")).toThrow();
    expect(() => shutdownTimeoutMs("Infinity")).toThrow();
  });
});
