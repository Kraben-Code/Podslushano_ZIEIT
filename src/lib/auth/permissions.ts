import "server-only";

import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { rolePermissions, userRoles } from "@/lib/db/schema";

export async function getUserPermissions(userId: string) {
  const permissions = await getDatabase()
    .selectDistinct({ key: rolePermissions.permissionKey })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleKey, userRoles.roleKey))
    .where(
      and(
        eq(userRoles.userId, userId),
        or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, new Date())),
        or(
          isNull(userRoles.suspendedUntil),
          lte(userRoles.suspendedUntil, new Date()),
        ),
      ),
    );

  return permissions.map((permission) => permission.key);
}

export async function hasPermission(userId: string, permissionKey: string) {
  const [permission] = await getDatabase()
    .select({ key: rolePermissions.permissionKey })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleKey, userRoles.roleKey))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(rolePermissions.permissionKey, permissionKey),
        or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, new Date())),
        or(
          isNull(userRoles.suspendedUntil),
          lte(userRoles.suspendedUntil, new Date()),
        ),
      ),
    )
    .limit(1);

  return Boolean(permission);
}
