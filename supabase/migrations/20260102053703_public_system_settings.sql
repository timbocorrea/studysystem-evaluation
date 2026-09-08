create policy "Allow public read access"
on "public"."system_settings"
as permissive
for select
to public
using (true);
