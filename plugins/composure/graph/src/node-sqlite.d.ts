/**
 * Type declarations for Node.js built-in node:sqlite module.
 *
 * Node 22.5+ ships with an experimental SQLite module (DatabaseSync).
 * No official @types package exists yet. These declarations cover the
 * subset we use: DatabaseSync with prepare/run/close.
 */

declare module "node:sqlite" {
  export interface StatementResult {
    lastInsertRowid: number | bigint;
    changes: number;
  }

  export interface Statement {
    run(...params: unknown[]): StatementResult;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    close(): void;
    /** Execute raw SQL (DDL, PRAGMA, BEGIN/COMMIT/ROLLBACK). */
    exec(sql: string): void;
    prepare(sql: string): Statement;
  }
}
