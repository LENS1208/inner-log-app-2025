/*
  # Add automatic user_settings creation trigger

  1. Purpose
    - Automatically create user_settings row when a new user signs up
    - Ensures all users have default settings without manual intervention
    - Prevents errors from missing settings

  2. Changes
    - Create trigger function to auto-create user_settings
    - Attach trigger to auth.users table on INSERT
    - Uses default values already defined in user_settings table

  3. Security
    - Trigger runs with proper permissions
    - Only creates settings for new users (not existing)
*/

-- Create function to automatically create user settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default settings for the new user
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user_settings with defaults when a new user signs up';
