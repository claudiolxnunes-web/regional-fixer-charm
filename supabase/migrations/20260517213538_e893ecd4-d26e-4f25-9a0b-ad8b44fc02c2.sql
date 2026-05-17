-- Update handle_new_user to process invite tokens and roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _invite_token TEXT;
    _invite_record RECORD;
    _role public.app_role;
    _full_name TEXT;
BEGIN
    _invite_token := NEW.raw_user_meta_data->>'invite_token';
    _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, _full_name);

    -- Check for invite
    IF _invite_token IS NOT NULL THEN
        SELECT * INTO _invite_record FROM public.invites 
        WHERE token = _invite_token AND used_at IS NULL AND expires_at > now()
        LIMIT 1;

        IF _invite_record.id IS NOT NULL THEN
            -- Use the role from the invite
            _role := _invite_record.role::public.app_role;
            
            -- Add to team_members
            INSERT INTO public.team_members (team_id, user_id, role)
            VALUES (_invite_record.team_id, NEW.id, _invite_record.role);

            -- Mark invite as used
            UPDATE public.invites SET used_at = now(), used_by = NEW.id WHERE id = _invite_record.id;
        ELSE
            -- Fallback role if invite invalid
            _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'::public.app_role);
        END IF;
    ELSE
        -- Default role from metadata or 'user'
        _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'::public.app_role);
    END IF;

    -- Assign role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

    RETURN NEW;
END;
$$;

-- Ensure trigger is correctly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
