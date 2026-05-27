import { accessSync, constants, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const MIN_NODE_MAJOR = 20;
const MAX_NODE_MAJOR_EXCLUSIVE = 25;

export function assertRuntimeCompatible() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (!Number.isFinite(major) || major < MIN_NODE_MAJOR || major >= MAX_NODE_MAJOR_EXCLUSIVE) {
    throw new Error(
      `Unsupported Node.js version ${process.versions.node}. FOSS Radar requires Node >=${MIN_NODE_MAJOR} and <${MAX_NODE_MAJOR_EXCLUSIVE}.`,
    );
  }
}

export function resolveDataDir() {
  const configured = process.env.DATA_DIR?.trim();
  const dataDir = configured ? resolve(configured) : process.cwd();
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  accessSync(dataDir, constants.W_OK);
  return dataDir;
}

export function runPreflightChecks() {
  assertRuntimeCompatible();
  resolveDataDir();
}
