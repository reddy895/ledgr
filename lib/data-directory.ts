import fs from "node:fs";
import path from "node:path";

export type DatabasePaths = {
  dataDirectory: string;
  databasePath: string;
};

let pathsLogged = false;

export function getDatabasePaths(): DatabasePaths {
  const configuredDirectory = process.env.LEDGR_DATA_DIR;
  if (process.env.NODE_ENV === "production" && !configuredDirectory) {
    throw new Error(
      "Startup configuration error: LEDGR_DATA_DIR is required when NODE_ENV=production. " +
        "Refusing to start because the database would otherwise be stored inside the container filesystem."
    );
  }

  const dataDirectory = path.resolve(
    configuredDirectory || path.join(process.cwd(), "data")
  );
  const databasePath = path.join(dataDirectory, "finance.db");

  try {
    fs.mkdirSync(dataDirectory, { recursive: true });
    fs.accessSync(dataDirectory, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Database directory "${dataDirectory}" is not accessible: ${detail}`);
  }

  if (!pathsLogged) {
    console.info(`Database directory: ${dataDirectory}\nDatabase: ${databasePath}`);
    pathsLogged = true;
  }

  return { dataDirectory, databasePath };
}