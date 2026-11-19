/**
 * Application-level ownership helpers.
 * Every campaign, prospect, and message query must include the authenticated
 * userId (directly or via campaign.userId). Middleware only proves a session
 * exists — these helpers keep cross-user access from leaking in services.
 */

export class OwnershipError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "OwnershipError";
  }
}

/** Prefer "not found" over "forbidden" so IDs of other users are not confirmed. */
export function assertOwned<T>(
  resource: T | null | undefined,
  message = "Resource not found.",
): T {
  if (resource == null) {
    throw new OwnershipError(message);
  }
  return resource;
}

export function ownedByUser<T extends { userId: string }>(
  resource: T | null | undefined,
  userId: string,
): T | null {
  if (!resource || resource.userId !== userId) {
    return null;
  }
  return resource;
}
