CREATE OR REPLACE FUNCTION private.make_ref(_prefix text, _seq text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE n BIGINT;
BEGIN
  EXECUTE format('SELECT nextval(%L)', _seq) INTO n;
  RETURN 'CF-' || _prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION private.make_ref(text, text) FROM PUBLIC, anon, authenticated;