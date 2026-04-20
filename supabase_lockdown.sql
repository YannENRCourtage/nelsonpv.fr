-- Supabase Lockdown Script
-- Run this in the Supabase SQL Editor to enable RLS and secure your database.

-- 1. Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Create Service Role Policy (Allows Vercel API to continue working)
-- The Vercel API uses Prisma with a connection string that bypasses RLS by default, 
-- but it's good practice to explicitly allow the service_role.

CREATE POLICY "Allow service_role full access" ON projects FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON contacts FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON boards FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON board_rows FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON board_comments FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON board_attachments FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service_role full access" ON notifications FOR ALL TO service_role USING (true);

-- 3. Block anonymous access (No policies for 'anon' role means access is denied by default)
-- If you want to be explicit:
-- CREATE POLICY "Deny all to anon" ON projects FOR ALL TO anon USING (false);

-- 4. (Optional) User ownership policies if you decide to use Supabase Auth later:
-- CREATE POLICY "Users can only see their own projects" ON projects
-- FOR SELECT TO authenticated
-- USING (user_id = auth.uid());
