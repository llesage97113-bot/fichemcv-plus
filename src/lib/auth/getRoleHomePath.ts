export type AuthMetadataRole = "admin" | "professeur" | "eleve";
export type RoleHomePath = "/admin" | "/" | "/eleve";

export function getRoleHomePath(role: unknown): RoleHomePath | null {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "professeur") {
    return "/";
  }

  if (role === "eleve") {
    return "/eleve";
  }

  return null;
}

export function getSafeRoleHomePath(role: unknown): RoleHomePath | "/login" {
  return getRoleHomePath(role) ?? "/login";
}

export function getRootRoleRedirectPath(
  role: unknown
): Exclude<RoleHomePath, "/"> | "/login" | null {
  const homePath = getRoleHomePath(role);

  if (homePath === "/") {
    return null;
  }

  return homePath ?? "/login";
}
