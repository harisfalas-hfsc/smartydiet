-- Admin check helper
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) IN ('smartydiet@outlook.com', 'harisfalas@gmail.com')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated, service_role;

-- Support threads
CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT 'Support request',
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  admin_unread boolean NOT NULL DEFAULT true,
  user_unread boolean NOT NULL DEFAULT false,
  user_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_threads TO authenticated;
GRANT ALL ON public.support_threads TO service_role;
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads readable by owner or admin" ON public.support_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "threads insert own" ON public.support_threads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin(auth.uid()));
CREATE POLICY "threads update own or admin" ON public.support_threads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

CREATE TRIGGER set_support_threads_updated_at
  BEFORE UPDATE ON public.support_threads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX support_threads_user_idx ON public.support_threads(user_id);
CREATE INDEX support_threads_last_message_idx ON public.support_threads(last_message_at DESC);

-- Support messages
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  author_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages readable by thread owner or admin" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = support_messages.thread_id
        AND (t.user_id = auth.uid() OR public.is_app_admin(auth.uid()))
    )
  );
CREATE POLICY "messages insert by thread owner or admin" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = support_messages.thread_id
        AND (t.user_id = auth.uid() OR public.is_app_admin(auth.uid()))
    )
  );

CREATE INDEX support_messages_thread_idx ON public.support_messages(thread_id, created_at);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'motivation',
  title text NOT NULL,
  body text,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX notifications_dedupe_idx ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);