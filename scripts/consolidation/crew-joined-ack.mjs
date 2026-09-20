/** Local acceptance fault injection; never used by a product server. */
export function createLostAcknowledgement() {
  let pending = true;
  const batches = [];
  const receipts = [];
  return {
    batches,
    receipts,
    record(events) {
      if (!Array.isArray(events)) throw Error("Expected fixture event array");
      batches.push(events.map((event) => event.id));
    },
    withhold(status, body) {
      receipts.push({
        status,
        results: Array.isArray(body?.results)
          ? body.results.map((row) => ({ id: row.id, status: row.status }))
          : [],
      });
      if (
        !pending ||
        status !== 200 ||
        !Array.isArray(body?.results) ||
        body.results.length === 0 ||
        !body.results.every((row) => row.status === "accepted")
      )
        return false;
      pending = false;
      return true;
    },
  };
}
