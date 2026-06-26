import {
  getRoleHomePath,
  getRootRoleRedirectPath,
  getSafeRoleHomePath,
} from "../src/lib/auth/getRoleHomePath";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  assert(
    actual === expected,
    `${message}. Attendu: ${String(expected)}. Reçu: ${String(actual)}.`
  );
}

function assertRoleHomePaths() {
  assertEquals(
    getRoleHomePath("admin"),
    "/admin",
    "Un administrateur doit arriver sur l'espace Administration"
  );
  assertEquals(
    getRoleHomePath("professeur"),
    "/",
    "Un professeur doit arriver sur le dashboard professeur"
  );
  assertEquals(
    getRoleHomePath("eleve"),
    "/eleve",
    "Un élève doit arriver sur l'espace élève"
  );
}

function assertUnknownRolesAreRejectedCleanly() {
  for (const role of [undefined, null, "", "teacher", "student", "superadmin"]) {
    assertEquals(
      getRoleHomePath(role),
      null,
      `Le rôle Auth ${String(role)} ne doit pas être accepté implicitement`
    );
    assertEquals(
      getSafeRoleHomePath(role),
      "/login",
      `Le rôle Auth ${String(role)} doit revenir vers une destination sûre`
    );
  }
}

function assertNoImplicitNonStudentFallbackToRoot() {
  assertEquals(
    getRoleHomePath("teacher"),
    null,
    "La valeur app_users.role teacher ne doit pas être traitée comme professeur"
  );
  assertEquals(
    getRoleHomePath("student"),
    null,
    "La valeur app_users.role student ne doit pas être traitée comme élève"
  );
}

function assertRootRedirects() {
  assertEquals(
    getRootRoleRedirectPath("admin"),
    "/admin",
    "Un administrateur qui ouvre / doit être redirigé vers /admin"
  );
  assertEquals(
    getRootRoleRedirectPath("professeur"),
    null,
    "Un professeur doit rester sur /"
  );
  assertEquals(
    getRootRoleRedirectPath("eleve"),
    "/eleve",
    "Un élève qui ouvre / doit être redirigé vers son espace"
  );
  assertEquals(
    getRootRoleRedirectPath("unknown"),
    "/login",
    "Un rôle inconnu qui ouvre / doit être refusé sans fallback professeur"
  );
}

assertRoleHomePaths();
assertUnknownRolesAreRejectedCleanly();
assertNoImplicitNonStudentFallbackToRoot();
assertRootRedirects();

console.log("Auth role redirect tests passed.");
