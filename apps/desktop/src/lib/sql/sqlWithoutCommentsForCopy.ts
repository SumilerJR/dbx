import { BACKSLASH_ESCAPE_STRING_DIALECTS } from "@/lib/sql/sqlStatementRanges";
import { resolveSqlDialectId } from "@/lib/sql/semantic/dialect";
import { tokenizeSqlSemantic } from "@/lib/sql/semantic/tokens";
import type { DatabaseType } from "@/types/database";

function keepSqlComment(text: string): boolean {
  // Optimizer hints and MySQL executable comments are sent to the engine.
  return text.startsWith("/*+") || text.startsWith("/*!");
}

function collapseBlankLines(sql: string): string {
  return sql
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function sqlWithoutCommentsForCopy(sql: string, databaseType?: DatabaseType): string {
  if (!sql) return "";
  const dialectId = resolveSqlDialectId({ databaseType });
  const mysqlLike = dialectId === "mysql" || dialectId === "doris";
  const tokens = tokenizeSqlSemantic(sql, dialectId, {
    mysqlDashCommentRequiresWhitespace: mysqlLike,
    mysqlBackslashEscape: !!databaseType && BACKSLASH_ESCAPE_STRING_DIALECTS.has(databaseType),
  });

  let output = "";
  let cursor = 0;
  for (const token of tokens) {
    if (token.kind !== "comment" || keepSqlComment(token.text)) continue;
    output += sql.slice(cursor, token.span.start);
    cursor = token.span.end;
  }
  output += sql.slice(cursor);
  return collapseBlankLines(output);
}
