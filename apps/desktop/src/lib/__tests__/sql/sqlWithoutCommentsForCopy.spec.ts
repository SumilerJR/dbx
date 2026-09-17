import { describe, expect, it } from "vitest";
import { sqlWithoutCommentsForCopy } from "@/lib/sql/sqlWithoutCommentsForCopy";

describe("sqlWithoutCommentsForCopy", () => {
  it("strips commented-out predicates and blank lines left behind", () => {
    const sql = `select *
from (
  select 1 as id, 'alpha' as keyword
) demo_tasks
where 1=1
-- and id in (42)
and keyword in ('alpha')
-- and keyword like "%beta%"
-- and env = 'prod'
-- and create_time > '2020-01-01'
order by id desc`;

    expect(sqlWithoutCommentsForCopy(sql, "mysql")).toBe(`select *
from (
  select 1 as id, 'alpha' as keyword
) demo_tasks
where 1=1
and keyword in ('alpha')
order by id desc`);
  });

  it("keeps -- and # that sit inside string literals", () => {
    expect(sqlWithoutCommentsForCopy("select '-- not comment', '# also not' from t -- drop", "mysql")).toBe("select '-- not comment', '# also not' from t");
  });

  it("strips MySQL # line comments", () => {
    expect(sqlWithoutCommentsForCopy("select 1 # note\nfrom t", "mysql")).toBe("select 1\nfrom t");
  });

  it("does not treat PostgreSQL #> as a hash comment", () => {
    expect(sqlWithoutCommentsForCopy("select data #> '{a}' -- note\nfrom t", "postgres")).toBe("select data #> '{a}'\nfrom t");
  });

  it("keeps optimizer hints and MySQL executable comments", () => {
    expect(sqlWithoutCommentsForCopy("select /*+ INDEX(t i) */ id from t /* docs */", "oracle")).toBe("select /*+ INDEX(t i) */ id from t");
    expect(sqlWithoutCommentsForCopy("select /*!40101 1 */ from t -- skip", "mysql")).toBe("select /*!40101 1 */ from t");
  });

  it("returns empty input unchanged", () => {
    expect(sqlWithoutCommentsForCopy("")).toBe("");
  });
});
