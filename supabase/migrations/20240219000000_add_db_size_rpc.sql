-- Create a function to get the database size
create or replace function get_db_size_bytes()
returns bigint
language sql
security definer
as $$
  select pg_database_size(current_database());
$$;
