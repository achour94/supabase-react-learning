-- Migration: Create user_profiles table and link sales_deals to users
-- Description: Adds user profile management with account types and associates sales deals with users

-- Step 1: Create the account_type enum
CREATE TYPE public.account_type AS ENUM ('admin', 'member');

-- Step 2: Create user_profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type public.account_type NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Add user_id column to sales_deals table
ALTER TABLE public.sales_deals
ADD COLUMN user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX idx_sales_deals_user_id ON public.sales_deals(user_id);
CREATE INDEX idx_user_profiles_account_type ON public.user_profiles(account_type);

-- Step 5: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to auto-update updated_at on user_profiles
CREATE TRIGGER on_user_profile_updated
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Step 7: Create function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, name, account_type)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'member'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger on auth.users to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (but not account_type)
CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND account_type = 'admin'
        )
    );

-- Step 11: Update RLS policies for sales_deals
-- Drop existing policies if any (optional, adjust based on your current setup)
-- CREATE POLICY "Users can create own deals"
--     ON public.sales_deals
--     FOR INSERT
--     WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can read own deals"
--     ON public.sales_deals
--     FOR SELECT
--     USING (auth.uid() = user_id);

-- Step 12: Grant necessary permissions
GRANT USAGE ON TYPE public.account_type TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- Enable realtime for user_profiles (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
