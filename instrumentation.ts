export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDatabasePaths } = await import("./lib/data-directory");
    getDatabasePaths();
  }
}