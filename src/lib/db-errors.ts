export function prismaErrorText(error: unknown): string {
  if (!error || typeof error !== "object") {
    return typeof error === "string" ? error : "";
  }
  const record = error as {
    message?: unknown;
    name?: unknown;
    code?: unknown;
    errorCode?: unknown;
    cause?: unknown;
  };
  return [
    record.name,
    record.code,
    record.errorCode,
    record.message,
    record.cause ? prismaErrorText(record.cause) : "",
  ]
    .filter((part) => part != null && String(part).length > 0)
    .map((part) => String(part))
    .join(" ");
}

export function isPrismaUnavailable(error: unknown): boolean {
  const text = prismaErrorText(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";
  const errorCode =
    error && typeof error === "object" && "errorCode" in error
      ? String((error as { errorCode?: string }).errorCode ?? "")
      : "";
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name ?? "")
      : "";
  return (
    code === "P1001" ||
    code === "P1017" ||
    code === "P2024" ||
    errorCode === "P1001" ||
    errorCode === "P1017" ||
    errorCode === "P2024" ||
    name === "PrismaClientInitializationError" ||
    /can't reach database server|timed out fetching a new connection|connection pool|PrismaClientInitializationError|imported module.*prisma/i.test(
      text,
    )
  );
}

export const DATABASE_UNREACHABLE_MESSAGE =
  "The app cannot reach the database from this network. Use a connection that allows PostgreSQL on port 5432 (for example your mobile hotspot), then retry.";
