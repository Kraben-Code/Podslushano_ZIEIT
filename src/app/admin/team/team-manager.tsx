"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  Clock3,
  Search,
  Shield,
  ShieldCheck,
  UserRound,
  UserRoundCog,
  UserRoundSearch,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

type ManagedRole = {
  key: string;
  name: string;
  description: string;
};

type RoleGrant = {
  roleKey: string;
  roleName: string;
  roleDescription: string;
  assignedAt: string;
  expiresAt: string | null;
  suspendedUntil: string | null;
};

type TeamMember = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  roles: RoleGrant[];
};

type RoleHistory = {
  id: string;
  targetUsername: string;
  actorUsername: string | null;
  action: string;
  metadata: unknown;
  createdAt: string;
};

type TeamResponse = {
  members: TeamMember[];
  availableRoles: ManagedRole[];
  history: RoleHistory[];
};

const teamResponseSchema = z.object({
  members: z.array(
    z.object({
      id: z.string().uuid(),
      username: z.string(),
      displayName: z.string(),
      isActive: z.boolean(),
      roles: z.array(
        z.object({
          roleKey: z.string(),
          roleName: z.string(),
          roleDescription: z.string(),
          assignedAt: z.string(),
          expiresAt: z.string().nullable(),
          suspendedUntil: z.string().nullable(),
        }),
      ),
    }),
  ),
  availableRoles: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
    }),
  ),
  history: z.array(
    z.object({
      id: z.string().uuid(),
      targetUsername: z.string(),
      actorUsername: z.string().nullable(),
      action: z.string(),
      metadata: z.unknown(),
      createdAt: z.string(),
    }),
  ),
});

const durationOptions = [
  { value: "permanent", label: "Безстроково" },
  { value: "30", label: "30 днів" },
  { value: "90", label: "90 днів" },
  { value: "365", label: "1 рік" },
];

const suspensionOptions = [
  { value: "1", label: "1 день" },
  { value: "7", label: "7 днів" },
  { value: "30", label: "30 днів" },
];

function getErrorMessage(value: unknown) {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = value.error;
    if (typeof error === "string") return error;
  }
  return "Не вдалося виконати дію. Спробуй ще раз.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getHistoryLabel(action: string) {
  switch (action) {
    case "role.granted":
      return "призначив(ла) роль";
    case "role.revoked":
      return "зняв(ла) роль";
    case "role.suspended":
      return "тимчасово призупинив(ла) роль";
    case "role.resumed":
      return "відновив(ла) роль";
    case "role.owner_bootstrapped":
      return "ініціалізував(ла) власника";
    default:
      return action;
  }
}

function getHistoryRole(metadata: unknown) {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "roleName" in metadata &&
    typeof metadata.roleName === "string"
  ) {
    return metadata.roleName;
  }
  return "роль";
}

export function TeamManager({ actorId }: { actorId: string }) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<TeamResponse>({
    members: [],
    availableRoles: [],
    history: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState("");
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>(
    {},
  );
  const [duration, setDuration] = useState("permanent");
  const [suspensionDays, setSuspensionDays] = useState("7");

  const loadMembers = useCallback(async (query: string, signal?: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/team/roles?q=${encodeURIComponent(query)}`,
        { cache: "no-store", signal },
      );
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(result));
        return;
      }

      const validated = teamResponseSchema.safeParse(result);
      if (!validated.success) {
        setError("Сервер повернув неочікувані дані. Онови сторінку.");
        return;
      }

      setData(validated.data);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError("Не вдалося завантажити команду. Перевір з’єднання.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }, []);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => void loadMembers(search, controller.signal),
      search ? 220 : 0,
    );

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadMembers, search]);

  const manageableRoleKeys = useMemo(
    () => new Set(data.availableRoles.map((role) => role.key)),
    [data.availableRoles],
  );

  async function changeRole(
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, string | number | null>,
    pendingId: string,
  ) {
    setPendingKey(pendingId);
    setError("");

    try {
      const response = await fetch("/api/admin/team/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(result));
        return;
      }

      await loadMembers(search);
    } catch {
      setError("Не вдалося зв’язатися із сервером. Зміни не підтверджено.");
    } finally {
      setPendingKey("");
    }
  }

  function assignRole(member: TeamMember) {
    const roleKey = roleSelections[member.id] ?? data.availableRoles[0]?.key;
    if (!roleKey) return;

    const selectedDuration =
      duration === "permanent" ? null : Number.parseInt(duration, 10);
    void changeRole(
      "POST",
      { userId: member.id, roleKey, expiresInDays: selectedDuration },
      `${member.id}:${roleKey}`,
    );
  }

  function removeRole(member: TeamMember, grant: RoleGrant) {
    if (
      !window.confirm(
        `Зняти роль «${grant.roleName}» з користувача @${member.username}?`,
      )
    ) {
      return;
    }

    void changeRole(
      "DELETE",
      { userId: member.id, roleKey: grant.roleKey },
      `${member.id}:${grant.roleKey}`,
    );
  }

  function toggleSuspension(member: TeamMember, grant: RoleGrant) {
    const isSuspended =
      grant.suspendedUntil !== null &&
      new Date(grant.suspendedUntil).getTime() > Date.now();
    const suspensionLength = Number.parseInt(suspensionDays, 10);

    if (
      !isSuspended &&
      !window.confirm(
        `Тимчасово призупинити роль «${grant.roleName}» для @${member.username}?`,
      )
    ) {
      return;
    }

    void changeRole(
      "PATCH",
      {
        userId: member.id,
        roleKey: grant.roleKey,
        suspensionDays: isSuspended ? 0 : suspensionLength,
      },
      `${member.id}:${grant.roleKey}`,
    );
  }

  return (
    <div className="team-content">
      <div className="team-title-row">
        <div>
          <div className="team-eyebrow">
            <span /> КЕРУВАННЯ ДОСТУПОМ
          </div>
          <h1>Команда та ролі</h1>
          <p>Призначай повноваження, керуй доступом і переглядай історію змін.</p>
        </div>
        <div className="team-title-mark">
          <UserRoundCog size={25} />
        </div>
      </div>

      <section aria-label="Пошук користувачів" className="team-search-panel">
        <div className="team-search-input">
          <Search size={17} />
          <input
            aria-label="Знайти користувача за логіном або ім’ям"
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Пошук за логіном або ім’ям"
            value={search}
          />
          {search && (
            <button
              aria-label="Очистити пошук"
              onClick={() => setSearch("")}
              type="button"
            >
              ×
            </button>
          )}
        </div>
        <span className="team-search-hint">
          <UserRoundSearch size={15} />
          До 30 результатів
        </span>
      </section>

      {error && (
        <p aria-live="polite" className="team-error" role="alert">
          {error}
        </p>
      )}

      <section aria-labelledby="team-members-title" className="team-section">
        <div className="team-section-heading">
          <div>
            <h2 id="team-members-title">Користувачі</h2>
            <p>Ролі й повноваження кожного акаунта.</p>
          </div>
          <span className="team-result-count">
            {loading ? "…" : data.members.length}
          </span>
        </div>

        {loading ? (
          <div className="team-empty-state">
            <div className="team-spinner" />
            <span>Завантажуємо користувачів…</span>
          </div>
        ) : data.members.length === 0 ? (
          <div className="team-empty-state">
            <UserX size={25} />
            <strong>Користувачів не знайдено</strong>
            <span>Спробуй інший логін або ім’я.</span>
          </div>
        ) : (
          <div className="team-member-list">
            {data.members.map((member) => {
              const selectedRole =
                roleSelections[member.id] ?? data.availableRoles[0]?.key ?? "";

              return (
                <article className="team-member-card" key={member.id}>
                  <div className="member-card-head">
                    <div className="member-avatar">
                      {Array.from(member.displayName.trim()).slice(0, 1).join("")}
                    </div>
                    <div className="member-primary">
                      <strong>{member.displayName}</strong>
                      <span>@{member.username}</span>
                    </div>
                    <span
                      className={`member-status ${member.isActive ? "member-active" : "member-inactive"}`}
                    >
                      {member.isActive ? "Активний" : "Заблокований"}
                    </span>
                  </div>

                  <div className="member-roles">
                    {member.roles.length === 0 ? (
                      <span className="member-no-roles">Додаткових ролей немає</span>
                    ) : (
                      member.roles.map((grant) => {
                        const suspended =
                          grant.suspendedUntil !== null &&
                          new Date(grant.suspendedUntil).getTime() > Date.now();
                        const manageable =
                          member.id !== actorId &&
                          manageableRoleKeys.has(grant.roleKey);
                        const pending =
                          pendingKey === `${member.id}:${grant.roleKey}`;

                        return (
                          <div
                            className={`role-grant ${suspended ? "role-grant-suspended" : ""}`}
                            key={grant.roleKey}
                          >
                            <span className="role-grant-icon">
                              <ShieldCheck size={14} />
                            </span>
                            <span className="role-grant-copy">
                              <strong>{grant.roleName}</strong>
                              <span>
                                Призначено {formatDate(grant.assignedAt)}
                                {grant.expiresAt
                                  ? ` · до ${formatDate(grant.expiresAt)}`
                                  : " · безстроково"}
                                {suspended &&
                                  ` · призупинено до ${formatDate(grant.suspendedUntil!)}`}
                              </span>
                            </span>
                            {manageable && (
                              <span className="role-grant-actions">
                                {grant.roleKey !== "USER" && (
                                  <button
                                    aria-label={
                                      suspended
                                        ? `Відновити роль ${grant.roleName}`
                                        : `Призупинити роль ${grant.roleName}`
                                    }
                                    disabled={pending}
                                    onClick={() =>
                                      toggleSuspension(member, grant)
                                    }
                                    title={
                                      suspended
                                        ? "Відновити повноваження"
                                        : `Призупинити на ${suspensionDays} дн.`
                                    }
                                    type="button"
                                  >
                                    {suspended ? (
                                      <ArrowDownLeft size={15} />
                                    ) : (
                                      <Clock3 size={15} />
                                    )}
                                  </button>
                                )}
                                {grant.roleKey !== "USER" && (
                                  <button
                                    aria-label={`Зняти роль ${grant.roleName}`}
                                    className="role-remove-button"
                                    disabled={pending}
                                    onClick={() => removeRole(member, grant)}
                                    title="Зняти роль"
                                    type="button"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {member.id !== actorId &&
                    member.isActive &&
                    data.availableRoles.length > 0 && (
                      <div className="member-role-controls">
                        <label className="team-select-wrap">
                          <span className="sr-only">Роль для призначення</span>
                          <select
                            aria-label={`Роль для ${member.displayName}`}
                            onChange={(event) =>
                              setRoleSelections((current) => ({
                                ...current,
                                [member.id]: event.target.value,
                              }))
                            }
                            value={selectedRole}
                          >
                            {data.availableRoles.map((role) => (
                              <option key={role.key} value={role.key}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="team-select-wrap duration-select">
                          <span className="sr-only">Термін ролі</span>
                          <select
                            aria-label="Термін призначення ролі"
                            onChange={(event) => setDuration(event.target.value)}
                            value={duration}
                          >
                            {durationOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="assign-role-button"
                          disabled={pendingKey === `${member.id}:${selectedRole}`}
                          onClick={() => assignRole(member)}
                          type="button"
                        >
                          <Shield size={14} /> Призначити
                        </button>
                        {member.roles.some(
                          (grant) =>
                            grant.roleKey !== "USER" &&
                            manageableRoleKeys.has(grant.roleKey) &&
                            !(
                              grant.suspendedUntil &&
                              new Date(grant.suspendedUntil) > new Date()
                            ),
                        ) && (
                          <label className="team-select-wrap suspension-select">
                            <span className="sr-only">Термін призупинення</span>
                            <select
                              aria-label="Термін тимчасового призупинення"
                              onChange={(event) =>
                                setSuspensionDays(event.target.value)
                              }
                              value={suspensionDays}
                            >
                              {suspensionOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="role-history-title" className="team-section history-section">
        <div className="team-section-heading">
          <div>
            <h2 id="role-history-title">Історія змін ролей</h2>
            <p>Журнал призначень, зняття та тимчасового призупинення.</p>
          </div>
          <span className="history-icon">
            <Clock3 size={16} />
          </span>
        </div>
        {data.history.length === 0 ? (
          <div className="history-empty">
            Зміни ролей для цих користувачів з’являться тут.
          </div>
        ) : (
          <ol className="role-history-list">
            {data.history.map((entry) => (
              <li key={entry.id}>
                <span className="history-marker" />
                <div className="history-entry">
                  <p>
                    <strong>{entry.actorUsername ?? "Система"}</strong>{" "}
                    {getHistoryLabel(entry.action)}{" "}
                    <strong>{getHistoryRole(entry.metadata)}</strong> для{" "}
                    <strong>@{entry.targetUsername}</strong>
                  </p>
                  <time dateTime={entry.createdAt}>
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="team-bottom-link">
        <Link href="/profile">
          <ArrowLeft size={15} /> Повернутися до профілю
        </Link>
        <span>Ви увійшли як адміністратор команди</span>
      </div>
    </div>
  );
}
