-- Read-only Supabase schema inventory. Run the complete file in SQL Editor and
-- export every result grid. It intentionally performs catalog SELECTs only.

select extname, extversion
from pg_extension
where extname in ('pgcrypto', 'plpgsql')
order by extname;

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

select table_schema, table_name, ordinal_position, column_name, data_type,
       udt_schema, udt_name, is_nullable, column_default,
       character_maximum_length, numeric_precision, numeric_scale,
       is_identity, identity_generation, is_generated, generation_expression
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select n.nspname as schema_name, cls.relname as table_name,
       con.conname as constraint_name, con.contype as constraint_type,
       pg_get_constraintdef(con.oid, true) as definition,
       ref.relname as referenced_table
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace n on n.oid = cls.relnamespace
left join pg_class ref on ref.oid = con.confrelid
where n.nspname = 'public'
order by cls.relname, con.contype, con.conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

select event_object_schema, event_object_table, trigger_name,
       action_timing, string_agg(event_manipulation, ', ' order by event_manipulation) as events,
       action_orientation, action_condition, action_statement
from information_schema.triggers
where trigger_schema = 'public'
group by event_object_schema, event_object_table, trigger_name, action_timing,
         action_orientation, action_condition, action_statement
order by event_object_table, trigger_name;

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       pg_get_function_result(p.oid) as result_type,
       l.lanname as language, p.prosecdef as security_definer,
       p.provolatile as volatility, p.proconfig as configuration,
       pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       md5(pg_get_functiondef(p.oid)) as definition_hash
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, identity_arguments;

select schemaname, tablename, policyname, permissive, roles, cmd,
       qual as using_expression, with_check as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select n.nspname as schema_name, t.typname as type_name,
       e.enumsortorder, e.enumlabel
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public'
order by t.typname, e.enumsortorder;

select version, name
from supabase_migrations.schema_migrations
order by version;

select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_orientation, action_statement
from information_schema.triggers
where event_object_schema = 'auth' and event_object_table = 'users'
order by trigger_name, event_manipulation;
