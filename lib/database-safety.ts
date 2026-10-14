export const ISOLATED_DATABASE_NAME = "sparta_siaga_isolated";

type DatabaseNameResult = {
  rows: Array<{ database_name?: string }>;
};

export interface DatabaseNameQueryable {
  query(sql: string): Promise<DatabaseNameResult>;
}

export async function assertIsolatedDatabase(
  queryable: DatabaseNameQueryable
): Promise<void> {
  const result = await queryable.query(
    "SELECT current_database() AS database_name"
  );
  const databaseName = result.rows[0]?.database_name;

  if (databaseName !== ISOLATED_DATABASE_NAME) {
    throw new Error(
      `Refusing database write: connected to "${databaseName ?? "unknown"}"; expected "${ISOLATED_DATABASE_NAME}".`
    );
  }
}
