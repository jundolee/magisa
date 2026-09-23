import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CRON_SHARD_COUNT, kstDayStart, sourceShard } from "../src/lib/ingestion/cron-sharding.ts";

test("every source has one stable shard in the configured range", () => {
  const seen = new Set();
  for (let index = 0; index < 1000; index++) {
    const id = `source-${index}`;
    const shard = sourceShard(id);
    assert.equal(shard, sourceShard(id));
    assert.ok(shard >= 0 && shard < CRON_SHARD_COUNT);
    seen.add(shard);
    assert.equal(Array.from({ length: CRON_SHARD_COUNT }, (_, candidate) => candidate)
      .filter((candidate) => candidate === shard).length, 1);
  }
  assert.equal(seen.size, CRON_SHARD_COUNT);
});

test("KST day starts at 15:00 UTC on the previous calendar day", () => {
  assert.equal(kstDayStart(new Date("2026-09-22T14:59:59Z")), "2026-09-21T15:00:00.000Z");
  assert.equal(kstDayStart(new Date("2026-09-22T15:00:00Z")), "2026-09-22T15:00:00.000Z");
});

test("every first and retry shard has one daily Vercel cron", () => {
  const { crons } = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(crons.length, CRON_SHARD_COUNT * 2);
  for (const [sweep, schedule] of [["first", "0 22 * * *"], ["retry", "0 23 * * *"]]) {
    for (let shard = 0; shard < CRON_SHARD_COUNT; shard++) {
      assert.deepEqual(crons.filter((cron) => cron.path === `/api/cron/ingest/${sweep}/${shard}`),
        [{ path: `/api/cron/ingest/${sweep}/${shard}`, schedule }]);
    }
  }
});
