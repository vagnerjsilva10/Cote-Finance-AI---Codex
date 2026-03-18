-- PostgreSQL mojibake fixer for text/varchar columns in schema public.
-- Run with: psql "$DATABASE_URL" -f scripts/sql/fix-db-mojibake.sql
-- IMPORTANT: take a backup before running in production.

BEGIN;

CREATE OR REPLACE FUNCTION public.try_fix_mojibake(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  candidate text;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    candidate := convert_from(convert_to(input_text, 'LATIN1'), 'UTF8');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN input_text;
  END;

  -- Keep original when conversion did not improve the value.
  IF candidate IS NULL THEN
    RETURN input_text;
  END IF;

  IF (
    candidate LIKE '%' || chr(195) || '%'
    OR candidate LIKE '%' || chr(194) || '%'
    OR candidate LIKE '%' || chr(65533) || '%'
    OR candidate LIKE '%?%'
  ) AND NOT (
    input_text LIKE '%' || chr(195) || '%'
    OR input_text LIKE '%' || chr(194) || '%'
    OR input_text LIKE '%' || chr(65533) || '%'
    OR input_text LIKE '%?%'
  ) THEN
    RETURN input_text;
  END IF;

  RETURN candidate;
END;
$$;

DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying', 'character')
  LOOP
    EXECUTE format(
      'UPDATE %I.%I
       SET %I = public.try_fix_mojibake(%I)
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
      col.column_name,
      col.column_name,
      col.column_name
    );
  END LOOP;
END $$;

-- Optional: inspect updated rows with the audit script afterwards.
COMMIT;
