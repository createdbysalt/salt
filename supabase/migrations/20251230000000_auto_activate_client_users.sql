-- Auto-activate client_users when they successfully authenticate
-- This triggers when a user signs in for the first time after being invited

-- Function to activate pending client_users when user logs in
CREATE OR REPLACE FUNCTION auto_activate_client_user()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user logs in (last_sign_in_at changes), activate any pending memberships
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.client_users
    SET 
      status = 'active',
      updated_at = NOW()
    WHERE 
      user_id = NEW.id 
      AND status = 'pending';
    
    -- Log for debugging
    IF FOUND THEN
      RAISE NOTICE 'Activated pending client_users for user %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS auto_activate_client_user_trigger ON auth.users;
CREATE TRIGGER auto_activate_client_user_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_client_user();

-- Add comment for documentation
COMMENT ON FUNCTION auto_activate_client_user() IS 'Automatically activates pending client_users when they sign in for the first time';

