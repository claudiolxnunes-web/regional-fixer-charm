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
    _team_id UUID;
BEGIN
    _invite_token := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
    _full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
    _role := COALESCE((NULLIF(NEW.raw_user_meta_data->>'role', ''))::public.app_role, 'user'::public.app_role);

    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, _full_name)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    IF _invite_token IS NOT NULL THEN
        SELECT * INTO _invite_record
        FROM public.invites
        WHERE token = _invite_token
          AND used_at IS NULL
          AND expires_at > now()
        LIMIT 1;

        IF _invite_record.id IS NOT NULL THEN
            _role := _invite_record.role::public.app_role;

            INSERT INTO public.team_members (team_id, user_id, role)
            VALUES (_invite_record.team_id, NEW.id, _invite_record.role)
            ON CONFLICT (user_id) DO NOTHING;

            UPDATE public.invites
            SET used_at = now(), used_by = NEW.id
            WHERE id = _invite_record.id;
        END IF;
    END IF;

    IF _invite_record.id IS NULL AND _role IN ('manager'::public.app_role, 'admin'::public.app_role) THEN
        INSERT INTO public.teams (owner_id, name, plan, subscription_status, current_period_end)
        VALUES (
            NEW.id,
            'Equipe de ' || COALESCE(split_part(NEW.email, '@', 1), 'Gestor'),
            'trial',
            'trialing',
            now() + interval '7 days'
        )
        RETURNING id INTO _team_id;

        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (_team_id, NEW.id, 'manager')
        ON CONFLICT (user_id) DO NOTHING;

        _role := 'manager'::public.app_role;
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS teams_read ON public.teams;
CREATE POLICY teams_read ON public.teams
FOR SELECT
TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR id = public.current_team_id()
);

DROP POLICY IF EXISTS teams_update ON public.teams;
CREATE POLICY teams_update ON public.teams
FOR UPDATE
TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR (id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager'))
)
WITH CHECK (
  public.is_superadmin(auth.uid())
  OR (id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager'))
);