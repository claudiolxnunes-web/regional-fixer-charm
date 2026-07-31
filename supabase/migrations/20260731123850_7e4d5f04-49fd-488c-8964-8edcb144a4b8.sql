-- 1) Storage: lock down the private export buckets to admins/superadmins only
CREATE POLICY "Admins can read export files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('database_export_24_07_26','database_export_25_07_26')
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
);

CREATE POLICY "Admins can upload export files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('database_export_24_07_26','database_export_25_07_26')
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
);

CREATE POLICY "Admins can update export files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('database_export_24_07_26','database_export_25_07_26')
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
)
WITH CHECK (
  bucket_id IN ('database_export_24_07_26','database_export_25_07_26')
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
);

CREATE POLICY "Admins can delete export files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('database_export_24_07_26','database_export_25_07_26')
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
);

-- 2) goal_targets: reps only see their own targets
DROP POLICY IF EXISTS goal_targets_read ON public.goal_targets;

CREATE POLICY goal_targets_read ON public.goal_targets
FOR SELECT TO authenticated
USING (
  team_id = public.current_team_id()
  AND (
    public.is_staff(auth.uid())
    OR representative_id = public.current_rep_id()
    OR (representative_code IS NOT NULL AND representative_code = public.current_rep_code())
  )
);