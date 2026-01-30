-- Migration: Add RLS policies for user_profiles and sales_deals
-- This migration adds non-recursive RLS policies following Supabase best practices

-- ============================================================================
-- HELPER FUNCTION: Get current user's account type without causing recursion
-- Using SECURITY DEFINER bypasses RLS, preventing infinite loops
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_account_type()
RETURNS public.account_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_type
  FROM public.user_profiles
  WHERE id = auth.uid()
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_account_type() TO authenticated;

-- ============================================================================
-- USER_PROFILES POLICIES
-- ============================================================================

-- Policy: Users can read their own profile
-- Uses direct comparison with auth.uid() - no subqueries, no recursion risk
CREATE POLICY "users_read_own_profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
-- Restricts to own profile only
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can read all profiles
-- Uses the SECURITY DEFINER helper function to avoid recursion
CREATE POLICY "admins_read_all_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.get_current_user_account_type() = 'admin');

-- Policy: Service role bypass (for triggers and server-side operations)
-- This allows the handle_new_user trigger to create profiles
CREATE POLICY "service_role_all_access"
  ON public.user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SALES_DEALS POLICIES
-- ============================================================================

-- Enable RLS on sales_deals
ALTER TABLE public.sales_deals ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read all deals
-- This is needed for the dashboard to show all deals
CREATE POLICY "authenticated_read_all_deals"
  ON public.sales_deals
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can create deals (automatically linked to their profile)
-- The user_id must match the authenticated user
CREATE POLICY "users_create_own_deals"
  ON public.sales_deals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own deals
CREATE POLICY "users_update_own_deals"
  ON public.sales_deals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own deals
CREATE POLICY "users_delete_own_deals"
  ON public.sales_deals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can manage all deals
CREATE POLICY "admins_manage_all_deals"
  ON public.sales_deals
  FOR ALL
  TO authenticated
  USING (public.get_current_user_account_type() = 'admin')
  WITH CHECK (public.get_current_user_account_type() = 'admin');

-- Policy: Service role full access
CREATE POLICY "service_role_all_deals"
  ON public.sales_deals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ANONYMOUS ACCESS (optional - currently disabled)
-- Uncomment if you want to allow anonymous users to read deals
-- ============================================================================

-- CREATE POLICY "anon_read_deals"
--   ON public.sales_deals
--   FOR SELECT
--   TO anon
--   USING (true);
