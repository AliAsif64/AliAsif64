-- DSR Solutions: Business OS & AI Automation Suite — Supabase-native backend
-- Multi-tenant schema with Row Level Security. Users come from Supabase Auth;
-- each auth user has a profile pointing at their organization (tenant).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------- Core tables ----------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'SME' check (plan in ('SME','ENTERPRISE')),
  is_demo boolean not null default false,
  demo_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role text not null default 'MEMBER' check (role in ('OWNER','ADMIN','MANAGER','MEMBER')),
  department text,
  title text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  product text not null check (product in ('BUSINESS_OS','AI_SUITE','BUNDLE')),
  tier text not null check (tier in ('SME','ENTERPRISE')),
  billing_period text not null default 'MONTHLY' check (billing_period in ('MONTHLY','ANNUAL')),
  status text not null default 'TRIALING' check (status in ('TRIALING','ACTIVE','PAST_DUE','CANCELED','INCOMPLETE')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  smtp_from text,
  slack_webhook_url text,
  stripe_secret_key text,
  updated_at timestamptz not null default now()
);

-- ---------- Business OS ----------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'NEW' check (status in ('NEW','CONTACTED','QUALIFIED','UNQUALIFIED')),
  notes text,
  ai_score int check (ai_score between 0 and 100),
  ai_score_rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  value numeric not null default 0,
  stage text not null default 'NEW' check (stage in ('NEW','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST')),
  contact_id uuid references public.contacts(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  expected_close_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  client_name text not null,
  client_email text,
  status text not null default 'DRAFT' check (status in ('DRAFT','SENT','PAID','OVERDUE','VOID')),
  issue_date timestamptz not null default now(),
  due_date timestamptz not null,
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  notes text,
  paid_at timestamptz,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  amount numeric not null default 0
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'TODO' check (status in ('TODO','IN_PROGRESS','DONE')),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- AI Automation Suite ----------

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in ('CONTACT_CREATED','DEAL_STAGE_CHANGED','INVOICE_OVERDUE','TASK_COMPLETED','SCHEDULE','MANUAL')),
  trigger_config jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  status text not null check (status in ('SUCCESS','FAILED','PARTIAL')),
  log jsonb not null default '[]'::jsonb,
  triggered_by text,
  created_at timestamptz not null default now()
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('USER','ASSISTANT')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Internal config used by triggers to reach the automation-run edge function.
-- Populated once after the functions are deployed (see supabase/README.md).
create table public.app_config (
  id int primary key default 1 check (id = 1),
  automation_run_url text,
  internal_secret text
);
insert into public.app_config (id) values (1);

-- ---------- Tenancy helpers ----------

create or replace function public.current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Entitlement: which product a subscription grants, honoring bundle + trial.
create or replace function public.has_entitlement(required text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.organization_id = public.current_org_id()
      and (s.product = required or s.product = 'BUNDLE')
      and (s.status = 'ACTIVE' or (s.status = 'TRIALING' and s.trial_ends_at > now()))
  );
$$;

-- ---------- Row Level Security ----------

alter table public.organizations enable row level security;
create policy org_select on public.organizations for select
  using (id = public.current_org_id());
create policy org_update on public.organizations for update
  using (id = public.current_org_id() and public.current_user_role() in ('OWNER','ADMIN'));

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select
  using (organization_id = public.current_org_id());
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid());
create policy profiles_admin_update on public.profiles for update
  using (organization_id = public.current_org_id()
         and public.current_user_role() in ('OWNER','ADMIN')
         and role <> 'OWNER');

alter table public.subscriptions enable row level security;
create policy subscriptions_select on public.subscriptions for select
  using (organization_id = public.current_org_id());
-- writes: service role only (edge functions / Stripe webhook)

alter table public.integrations enable row level security;
create policy integrations_all on public.integrations for all
  using (organization_id = public.current_org_id() and public.current_user_role() in ('OWNER','ADMIN'))
  with check (organization_id = public.current_org_id() and public.current_user_role() in ('OWNER','ADMIN'));

alter table public.contacts enable row level security;
create policy contacts_all on public.contacts for all
  using (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'))
  with check (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'));

alter table public.deals enable row level security;
create policy deals_all on public.deals for all
  using (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'))
  with check (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'));

alter table public.invoices enable row level security;
create policy invoices_all on public.invoices for all
  using (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'))
  with check (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'));

alter table public.invoice_items enable row level security;
create policy invoice_items_all on public.invoice_items for all
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.organization_id = public.current_org_id())
         and public.has_entitlement('BUSINESS_OS'))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and i.organization_id = public.current_org_id())
              and public.has_entitlement('BUSINESS_OS'));

alter table public.projects enable row level security;
create policy projects_all on public.projects for all
  using (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'))
  with check (organization_id = public.current_org_id() and public.has_entitlement('BUSINESS_OS'));

alter table public.tasks enable row level security;
create policy tasks_all on public.tasks for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.organization_id = public.current_org_id())
         and public.has_entitlement('BUSINESS_OS'))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.organization_id = public.current_org_id())
              and public.has_entitlement('BUSINESS_OS'));

alter table public.automations enable row level security;
create policy automations_all on public.automations for all
  using (organization_id = public.current_org_id() and public.has_entitlement('AI_SUITE'))
  with check (organization_id = public.current_org_id() and public.has_entitlement('AI_SUITE'));

alter table public.automation_runs enable row level security;
create policy automation_runs_select on public.automation_runs for select
  using (exists (select 1 from public.automations a where a.id = automation_id and a.organization_id = public.current_org_id())
         and public.has_entitlement('AI_SUITE'));
-- writes: service role only (automation engine)

alter table public.ai_conversations enable row level security;
create policy ai_conversations_all on public.ai_conversations for all
  using (organization_id = public.current_org_id() and user_id = auth.uid() and public.has_entitlement('AI_SUITE'))
  with check (organization_id = public.current_org_id() and user_id = auth.uid() and public.has_entitlement('AI_SUITE'));

alter table public.ai_messages enable row level security;
create policy ai_messages_all on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c
                 where c.id = conversation_id and c.organization_id = public.current_org_id() and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c
                      where c.id = conversation_id and c.organization_id = public.current_org_id() and c.user_id = auth.uid()));

alter table public.app_config enable row level security;
-- no client policies: service role only

-- ---------- New-signup onboarding ----------
-- Registration flow: supabase.auth.signUp({email, password,
--   options: { data: { organization_name, name, plan } }})
-- Anonymous sign-ins (demo visitors) carry no organization_name and are
-- onboarded by the `demo` edge function instead.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
begin
  if coalesce(new.raw_user_meta_data->>'organization_name', '') = '' then
    return new;
  end if;
  insert into public.organizations (name, plan)
  values (new.raw_user_meta_data->>'organization_name',
          coalesce(nullif(new.raw_user_meta_data->>'plan',''), 'SME'))
  returning id into new_org;

  insert into public.profiles (id, organization_id, name, role)
  values (new.id, new_org,
          coalesce(nullif(new.raw_user_meta_data->>'name',''), new.email, 'Owner'), 'OWNER');

  insert into public.integrations (organization_id) values (new_org);

  insert into public.subscriptions (organization_id, product, tier, status, trial_ends_at)
  values (new_org, 'BUNDLE',
          coalesce(nullif(new.raw_user_meta_data->>'plan',''), 'SME'),
          'TRIALING', now() + interval '14 days');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Automation event dispatch ----------

create or replace function public.notify_automation(event text, payload jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg record;
begin
  select * into cfg from public.app_config where id = 1;
  if cfg.automation_run_url is null then
    return; -- functions not deployed/configured yet; events are simply skipped
  end if;
  perform net.http_post(
    url := cfg.automation_run_url,
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', cfg.internal_secret),
    body := jsonb_build_object('event', event, 'payload', payload)
  );
end;
$$;

create or replace function public.on_contact_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_automation('CONTACT_CREATED',
    jsonb_build_object('organization_id', new.organization_id, 'contact', to_jsonb(new)));
  return new;
end; $$;
create trigger trg_contact_created after insert on public.contacts
  for each row execute function public.on_contact_created();

create or replace function public.on_deal_stage_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_automation('DEAL_STAGE_CHANGED',
    jsonb_build_object('organization_id', new.organization_id, 'deal', to_jsonb(new), 'previous_stage', old.stage));
  return new;
end; $$;
create trigger trg_deal_stage_changed after update on public.deals
  for each row when (old.stage is distinct from new.stage)
  execute function public.on_deal_stage_changed();

create or replace function public.on_task_completed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org uuid;
begin
  select organization_id into org from public.projects where id = new.project_id;
  perform public.notify_automation('TASK_COMPLETED',
    jsonb_build_object('organization_id', org, 'task', to_jsonb(new)));
  return new;
end; $$;
create trigger trg_task_completed after update on public.tasks
  for each row when (new.status = 'DONE' and old.status is distinct from 'DONE')
  execute function public.on_task_completed();

create or replace function public.on_invoice_overdue() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_automation('INVOICE_OVERDUE',
    jsonb_build_object('organization_id', new.organization_id, 'invoice', to_jsonb(new)));
  return new;
end; $$;
create trigger trg_invoice_overdue after update on public.invoices
  for each row when (new.status = 'OVERDUE' and old.status is distinct from 'OVERDUE')
  execute function public.on_invoice_overdue();

-- ---------- Scheduled jobs ----------

-- Flip SENT invoices past due date to OVERDUE hourly (the status-change
-- trigger above then fires INVOICE_OVERDUE automations).
select cron.schedule('dsr-invoice-overdue', '0 * * * *', $$
  update public.invoices set status = 'OVERDUE'
  where status = 'SENT' and due_date < now();
$$);

-- Tick the automation engine every 5 minutes so SCHEDULE-type automations run.
select cron.schedule('dsr-automation-tick', '*/5 * * * *', $$
  select public.notify_automation('SCHEDULE_TICK', '{}'::jsonb);
$$);

-- Delete expired demo workspaces every 30 minutes (cascades wipe all data).
select cron.schedule('dsr-demo-cleanup', '*/30 * * * *', $$
  delete from public.organizations where is_demo and demo_expires_at < now();
$$);
