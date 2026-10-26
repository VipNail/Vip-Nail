export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { migrarAlArrancar } = await import("./lib/migrar");
    await migrarAlArrancar();
  }
}
