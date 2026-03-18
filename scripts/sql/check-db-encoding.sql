-- PostgreSQL UTF-8 verification + mojibake audit.
-- Run with: psql "$DATABASE_URL" -f scripts/sql/check-db-encoding.sql

SHOW server_encoding;
SHOW client_encoding;

SELECT
  current_database() AS database_name,
  pg_encoding_to_char(encoding) AS database_encoding,
  datcollate AS database_collation,
  datctype AS database_ctype
FROM pg_database
WHERE datname = current_database();

CREATE TEMP TABLE IF NOT EXISTS _encoding_scan (
  table_schema text,
  table_name text,
  column_name text,
  affected_rows bigint
);

TRUNCATE _encoding_scan;

DO $$
DECLARE
  col record;
  row_count bigint;
BEGIN
  FOR col IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'character')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I
       WHERE %I IS NOT NULL
         AND (
           %I LIKE ''%%'' || chr(195) || ''%%''
           OR %I LIKE ''%%'' || chr(194) || ''%%''
           OR %I LIKE ''%%'' || chr(65533) || ''%%''
           OR %I LIKE ''%%?%%''
         )',
      col.table_schema,
      col.table_name,
      col.column_name,
      col.column_name,
      col.column_name,
      col.column_name,
      col.column_name
    )
    INTO row_count;

    IF row_count > 0 THEN
      INSERT INTO _encoding_scan (table_schema, table_name, column_name, affected_rows)
      VALUES (col.table_schema, col.table_name, col.column_name, row_count);
    END IF;
  END LOOP;
END $$;

SELECT *
FROM _encoding_scan
ORDER BY affected_rows DESC, table_name, column_name;
