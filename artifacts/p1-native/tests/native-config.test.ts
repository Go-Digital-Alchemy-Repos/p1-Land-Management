import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import config from "../app.config.ts";

test("native config resolves the P1 icon and splash asset", async () => {
  assert.equal(config.expo.icon, "./assets/icon.png");
  assert.deepEqual(config.expo.splash, {
    image: "./assets/icon.png",
    resizeMode: "contain",
    backgroundColor: "#173c32",
  });
  const icon = await readFile(new URL("../assets/icon.png", import.meta.url));
  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});
