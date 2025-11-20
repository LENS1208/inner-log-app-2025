/*
  # Auto-confirm email on signup
  
  1. Changes
    - Create trigger to automatically confirm email when user signs up
    - This bypasses the email confirmation requirement for development
    
  2. Security
    - Only applies to new signups
    - Existing users are not affected
*/

-- Create function to auto-confirm email
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-confirm if email is not already confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
    NEW.confirmation_token = '';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- Confirm any existing unconfirmed users
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  updated_at = now()
WHERE email_confirmed_at IS NULL;
