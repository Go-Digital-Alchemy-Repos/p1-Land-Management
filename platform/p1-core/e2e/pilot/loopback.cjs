// Test-only network containment; leave application routing/security unchanged.
const { Server } = require("node:net");
const listen = Server.prototype.listen;
Server.prototype.listen = function (...args) {
  if (args[0] && typeof args[0] === "object" && "port" in args[0]) {
    args[0] = { ...args[0], host: "127.0.0.1" };
  }
  return listen.apply(this, args);
};
