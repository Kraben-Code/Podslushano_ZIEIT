import { and, desc, eq, gt, ilike, inArray, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, getUserPermissions } from "@/lib/auth/permissions";
import { hasSameOrigin } from "@/lib/auth/origin";
import { getDatabase } from "@/lib/db";
import {
  adminAuditLogs,
  profiles,
  roles,
  userRoles,
  users,
} from "@/lib/db/schema";

const assignmentSchema = z.object({
  userId: z.string().uuid(),
  roleKey: z.string().regex(/^[A-Z][A-Z0-9_]{1,49}$/),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
});

const changeSchema = z.object({
  userId: z.string().uuid(),
  roleKey: z.string().regex(/^[A-Z][A-Z0-9_]{1,49}$/),
});

const suspensionSchema = changeSchema.extend({
  suspensionDays: z.number().int().min(0).max(30),
});

async function authorizeTeamManager() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Потрібно увійти до акаунта." },
        { status: 401 },
      ),
    };
  }

  if (!(await hasPermission(user.id, "team.roles.manage"))) {
    return {
      error: NextResponse.json(
        { error: "Недостатньо прав для керування командою." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Запит має містити коректний JSON." },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: "Перевір дані запиту." },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}

async function getManagedRole(roleKey: string, actorId: string) {
  const [role] = await getDatabase()
    .select()
    .from(roles)
    .where(eq(roles.key, roleKey))
    .limit(1);

  if (
    !role ||
    !role.isAssignable ||
    role.isProtected ||
    !role.assignPermissionKey ||
    !(await hasPermission(actorId, role.assignPermissionKey))
  ) {
    return null;
  }

  return role;
}

export async function GET(request: Request) {
  const authorization = await authorizeTeamManager();
  if ("error" in authorization) return authorization.error;

  const search = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (search.length > 60) {
    return NextResponse.json(
      { error: "Пошуковий запит задовгий." },
      { status: 400 },
    );
  }

  const database = getDatabase();
  const matchingUsers = database
    .select({
      id: users.id,
      username: users.username,
      displayName: profiles.displayName,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id));

  const members = await (search
    ? matchingUsers.where(
        or(
          ilike(users.username, `%${search}%`),
          ilike(profiles.displayName, `%${search}%`),
        ),
      )
    : matchingUsers
  )
    .orderBy(desc(users.createdAt))
    .limit(30);

  const memberIds = members.map((member) => member.id);
  const now = new Date();
  const grants = memberIds.length
    ? await database
        .select({
          userId: userRoles.userId,
          roleKey: roles.key,
          roleName: roles.name,
          roleDescription: roles.description,
          assignedAt: userRoles.assignedAt,
          expiresAt: userRoles.expiresAt,
          suspendedUntil: userRoles.suspendedUntil,
        })
        .from(userRoles)
        .innerJoin(roles, eq(roles.key, userRoles.roleKey))
        .where(
          and(
            inArray(userRoles.userId, memberIds),
            or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, now)),
          ),
        )
    : [];
  const auditHistory = memberIds.length
    ? await database
        .select({
          id: adminAuditLogs.id,
          targetUserId: adminAuditLogs.targetUserId,
          targetUsername: adminAuditLogs.targetUsername,
          actorUsername: adminAuditLogs.actorUsername,
          action: adminAuditLogs.action,
          metadata: adminAuditLogs.metadata,
          createdAt: adminAuditLogs.createdAt,
        })
        .from(adminAuditLogs)
        .where(
          and(
            inArray(adminAuditLogs.targetUserId, memberIds),
            ilike(adminAuditLogs.action, "role.%"),
          ),
        )
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(100)
    : [];

  const actorPermissions = new Set(
    await getUserPermissions(authorization.user.id),
  );
  const availableRoles = (
    await database
      .select({
        key: roles.key,
        name: roles.name,
        description: roles.description,
        assignPermissionKey: roles.assignPermissionKey,
        isAssignable: roles.isAssignable,
        isProtected: roles.isProtected,
      })
      .from(roles)
      .orderBy(roles.name)
  ).filter(
    (role) =>
      role.isAssignable &&
      !role.isProtected &&
      role.assignPermissionKey !== null &&
      actorPermissions.has(role.assignPermissionKey),
  );

  return NextResponse.json(
    {
      members: members.map((member) => ({
        ...member,
        roles: grants.filter((grant) => grant.userId === member.id),
      })),
      availableRoles,
      history: auditHistory,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Запит не пройшов перевірку безпеки." },
      { status: 403 },
    );
  }

  const authorization = await authorizeTeamManager();
  if ("error" in authorization) return authorization.error;

  const parsed = await parseJson(request, assignmentSchema);
  if ("error" in parsed) return parsed.error;

  const { userId, roleKey, expiresInDays } = parsed.data;
  if (userId === authorization.user.id) {
    return NextResponse.json(
      { error: "Не можна змінювати власні ролі." },
      { status: 403 },
    );
  }

  const [target] = await getDatabase()
    .select({ id: users.id, username: users.username, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) {
    return NextResponse.json(
      { error: "Користувача не знайдено." },
      { status: 404 },
    );
  }
  if (!target.isActive) {
    return NextResponse.json(
      { error: "Не можна призначати ролі неактивному користувачу." },
      { status: 409 },
    );
  }

  const role = await getManagedRole(roleKey, authorization.user.id);
  if (!role) {
    return NextResponse.json(
      { error: "Цю роль не можна призначити вашими поточними повноваженнями." },
      { status: 403 },
    );
  }

  const now = new Date();
  const expiresAt =
    expiresInDays == null
      ? null
      : new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const assigned = await getDatabase().transaction(async (transaction) => {
    const [existing] = await transaction
      .select({
        id: userRoles.id,
        expiresAt: userRoles.expiresAt,
      })
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleKey, roleKey)),
      )
      .limit(1);

    if (existing && (!existing.expiresAt || existing.expiresAt > now)) {
      return false;
    }

    if (existing) {
      await transaction.delete(userRoles).where(eq(userRoles.id, existing.id));
    }

    const [grant] = await transaction
      .insert(userRoles)
      .values({
        userId,
        roleKey,
        assignedBy: authorization.user.id,
        expiresAt,
      })
      .onConflictDoNothing()
      .returning({ id: userRoles.id });

    if (!grant) return false;

    await transaction.insert(adminAuditLogs).values({
      actorUserId: authorization.user.id,
      actorUsername: authorization.user.username,
      targetUserId: target.id,
      targetUsername: target.username,
      action: "role.granted",
      metadata: {
        roleKey,
        roleName: role.name,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });

    return true;
  });

  if (!assigned) {
    return NextResponse.json(
      { error: "У користувача вже є ця роль або її щойно призначив інший адміністратор." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Запит не пройшов перевірку безпеки." },
      { status: 403 },
    );
  }

  const authorization = await authorizeTeamManager();
  if ("error" in authorization) return authorization.error;

  const parsed = await parseJson(request, suspensionSchema);
  if ("error" in parsed) return parsed.error;

  const { userId, roleKey, suspensionDays } = parsed.data;
  if (userId === authorization.user.id) {
    return NextResponse.json(
      { error: "Не можна змінювати власні ролі." },
      { status: 403 },
    );
  }

  const [target] = await getDatabase()
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) {
    return NextResponse.json(
      { error: "Користувача не знайдено." },
      { status: 404 },
    );
  }

  const role = await getManagedRole(roleKey, authorization.user.id);
  if (!role) {
    return NextResponse.json(
      { error: "Цю роль не можна змінити вашими поточними повноваженнями." },
      { status: 403 },
    );
  }

  const now = new Date();
  const suspendedUntil =
    suspensionDays === 0
      ? null
      : new Date(now.getTime() + suspensionDays * 24 * 60 * 60 * 1000);

  const updated = await getDatabase().transaction(async (transaction) => {
    const [grant] = await transaction
      .select({
        id: userRoles.id,
        expiresAt: userRoles.expiresAt,
      })
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleKey, roleKey)),
      )
      .limit(1);

    if (!grant || (grant.expiresAt && grant.expiresAt <= now)) {
      return false;
    }

    const [changed] = await transaction
      .update(userRoles)
      .set({ suspendedUntil })
      .where(eq(userRoles.id, grant.id))
      .returning({ id: userRoles.id });

    if (!changed) return false;

    await transaction.insert(adminAuditLogs).values({
      actorUserId: authorization.user.id,
      actorUsername: authorization.user.username,
      targetUserId: target.id,
      targetUsername: target.username,
      action: suspensionDays === 0 ? "role.resumed" : "role.suspended",
      metadata: {
        roleKey,
        roleName: role.name,
        suspendedUntil: suspendedUntil?.toISOString() ?? null,
      },
    });

    return true;
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Активне призначення ролі не знайдено." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { error: "Запит не пройшов перевірку безпеки." },
      { status: 403 },
    );
  }

  const authorization = await authorizeTeamManager();
  if ("error" in authorization) return authorization.error;

  const parsed = await parseJson(request, changeSchema);
  if ("error" in parsed) return parsed.error;

  const { userId, roleKey } = parsed.data;
  if (userId === authorization.user.id) {
    return NextResponse.json(
      { error: "Не можна змінювати власні ролі." },
      { status: 403 },
    );
  }

  const [target] = await getDatabase()
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) {
    return NextResponse.json(
      { error: "Користувача не знайдено." },
      { status: 404 },
    );
  }

  const role = await getManagedRole(roleKey, authorization.user.id);
  if (!role) {
    return NextResponse.json(
      { error: "Цю роль не можна відкликати вашими поточними повноваженнями." },
      { status: 403 },
    );
  }

  const removed = await getDatabase().transaction(async (transaction) => {
    const [grant] = await transaction
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleKey, roleKey)),
      )
      .limit(1);

    if (!grant) return false;

    const [deleted] = await transaction
      .delete(userRoles)
      .where(eq(userRoles.id, grant.id))
      .returning({ id: userRoles.id });
    if (!deleted) return false;

    await transaction.insert(adminAuditLogs).values({
      actorUserId: authorization.user.id,
      actorUsername: authorization.user.username,
      targetUserId: target.id,
      targetUsername: target.username,
      action: "role.revoked",
      metadata: { roleKey, roleName: role.name },
    });

    return true;
  });

  if (!removed) {
    return NextResponse.json(
      { error: "Призначення цієї ролі не знайдено." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
