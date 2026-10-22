// Node 24.19 on this Windows runtime can throw ENOMEM from os.userInfo()
// before tsx starts. Keep the compatibility shim scoped to CLI commands.
import os from "node:os";

if (process.platform === "win32") os.userInfo = () => ({ username: "navigator" });
