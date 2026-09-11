-- ================================================================
-- SISTEMA DE VENTAS - VIRTUALCORP
-- Esquema completo para Supabase. Pegar en: SQL Editor > New query > Run
-- ================================================================

-- ── USUARIOS (vendedores, supervisora, admin) ──
create table usuarios (
  id            uuid primary key references auth.users(id) on delete cascade,
  nombre        text not null,
  rol           text not null check (rol in ('ejecutivo','supervisor','admin')),
  vendedor_nombre text,         -- nombre que aparece en las ventas (ej: 'Alvaro')
  activo        boolean default true,
  created_at    timestamptz default now()
);

-- ── PERMISOS (checklist editable por el admin) ──
create table permisos (
  clave         text primary key,
  descripcion   text not null,
  ejecutivo     boolean default false,
  supervisor    boolean default false,
  admin         boolean default true
);

insert into permisos (clave, descripcion, ejecutivo, supervisor, admin) values
  ('ver_ventas_todos',       'Ver ventas de todos los vendedores',        false, true,  true),
  ('editar_ventas_ajenas',   'Editar ventas de otros vendedores',         false, true,  true),
  ('verificar_ventas_ajenas','Verificar ventas de otros vendedores',      false, true,  true),
  ('ver_reportes',           'Ver reportes (por curso, fechas, etc.)',    false, false, true),
  ('ver_bpo_todos',          'Ver el BPO de todos los vendedores',        false, true,  true),
  ('ver_ie',                 'Ver Ingresos y Egresos',                    false, false, true),
  ('gestionar_cronograma',   'Editar cronograma y capacitadores',         false, true,  true),
  ('gestionar_categorias_ie','Gestionar categorias de Ingresos/Egresos',  false, false, true),
  ('gestionar_usuarios',     'Crear y eliminar usuarios',                 false, false, true);

-- ── VENTAS ──
create table ventas (
  id                  uuid primary key default gen_random_uuid(),
  vendedor_id         uuid references usuarios(id),
  vendedor_nombre     text,
  turno               text,
  tipo                text default 'vivo' check (tipo in ('vivo','web')),
  marca_temporal      timestamptz default now(),
  nombres             text,
  ci                  text,
  celular             text,
  correo              text,
  numero_transaccion  text,
  razon_social        text,
  nit                 text,
  medio_cancelacion   text,
  atencion_cliente    text,
  notificaciones      text,
  fecha_pago          text,
  banco_billetera     text,
  banco               text,
  monto               numeric default 0,
  verificado          boolean default false,
  area                text,
  curso               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── INGRESOS / EGRESOS ──
create table ie_categorias (
  id        uuid primary key default gen_random_uuid(),
  tipo      text not null check (tipo in ('i','g')),
  nombre    text not null
);

insert into ie_categorias (tipo, nombre) values
  ('i','YouTube'), ('i','Otros Ingresos'),
  ('g','Sueldos y Salarios'), ('g','Publicidad');

create table ie_entradas (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('i','g')),
  categoria     text not null,
  monto         numeric not null default 0,
  fecha         date not null,
  descripcion   text,
  created_at    timestamptz default now()
);

-- ── CRONOGRAMA ──
create table capacitadores (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  celular       text,
  especialidad  text
);

create table cronograma_eventos (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null,
  curso           text not null,
  turno           text,
  vendedor_id     uuid references usuarios(id),
  capacitador_id  uuid references capacitadores(id)
);

create table cronograma_semanas (
  id      uuid primary key default gen_random_uuid(),
  curso   text not null,
  anio    int not null,
  mes     int not null,
  texto   text
);

-- ================================================================
-- FUNCIONES DE PERMISOS
-- ================================================================

create or replace function get_user_role() returns text as $$
  select rol from usuarios where id = auth.uid();
$$ language sql security definer stable;

create or replace function tiene_permiso(p_clave text) returns boolean as $$
  select coalesce(
    (select case get_user_role()
       when 'admin'      then admin
       when 'supervisor' then supervisor
       when 'ejecutivo'  then ejecutivo
       else false
     end
     from permisos where clave = p_clave),
    false
  );
$$ language sql security definer stable;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table usuarios enable row level security;
alter table ventas enable row level security;
alter table ie_categorias enable row level security;
alter table ie_entradas enable row level security;
alter table capacitadores enable row level security;
alter table cronograma_eventos enable row level security;
alter table cronograma_semanas enable row level security;
alter table permisos enable row level security;

-- USUARIOS: todos los logueados pueden ver la lista (para selects de vendedor), solo admin gestiona
create policy "usuarios_select" on usuarios for select using (auth.uid() is not null);
create policy "usuarios_insert" on usuarios for insert with check (tiene_permiso('gestionar_usuarios'));
create policy "usuarios_update" on usuarios for update using (tiene_permiso('gestionar_usuarios'));
create policy "usuarios_delete" on usuarios for delete using (tiene_permiso('gestionar_usuarios'));

-- PERMISOS: todos pueden leer (para saber que pueden hacer), solo admin edita
create policy "permisos_select" on permisos for select using (auth.uid() is not null);
create policy "permisos_update" on permisos for update using (get_user_role() = 'admin');

-- VENTAS: ver propias siempre; ver todas si tiene el permiso
create policy "ventas_select" on ventas for select using (
  vendedor_id = auth.uid() or tiene_permiso('ver_ventas_todos')
);
create policy "ventas_insert" on ventas for insert with check (auth.uid() is not null);
create policy "ventas_update" on ventas for update using (
  vendedor_id = auth.uid() or tiene_permiso('editar_ventas_ajenas')
);
create policy "ventas_delete" on ventas for delete using (
  get_user_role() = 'admin'
);

-- INGRESOS/EGRESOS: solo quien tiene el permiso ver_ie
create policy "ie_cat_select" on ie_categorias for select using (tiene_permiso('ver_ie'));
create policy "ie_cat_insert" on ie_categorias for insert with check (tiene_permiso('gestionar_categorias_ie'));
create policy "ie_cat_delete" on ie_categorias for delete using (tiene_permiso('gestionar_categorias_ie'));

create policy "ie_entradas_select" on ie_entradas for select using (tiene_permiso('ver_ie'));
create policy "ie_entradas_insert" on ie_entradas for insert with check (tiene_permiso('ver_ie'));
create policy "ie_entradas_update" on ie_entradas for update using (tiene_permiso('ver_ie'));
create policy "ie_entradas_delete" on ie_entradas for delete using (tiene_permiso('ver_ie'));

-- CRONOGRAMA: todos los logueados ven, solo con permiso gestionan
create policy "capacitadores_select" on capacitadores for select using (auth.uid() is not null);
create policy "capacitadores_write" on capacitadores for insert with check (tiene_permiso('gestionar_cronograma'));
create policy "capacitadores_update" on capacitadores for update using (tiene_permiso('gestionar_cronograma'));
create policy "capacitadores_delete" on capacitadores for delete using (tiene_permiso('gestionar_cronograma'));

create policy "crono_ev_select" on cronograma_eventos for select using (auth.uid() is not null);
create policy "crono_ev_write" on cronograma_eventos for insert with check (tiene_permiso('gestionar_cronograma'));
create policy "crono_ev_update" on cronograma_eventos for update using (tiene_permiso('gestionar_cronograma'));
create policy "crono_ev_delete" on cronograma_eventos for delete using (tiene_permiso('gestionar_cronograma'));

create policy "crono_sem_select" on cronograma_semanas for select using (auth.uid() is not null);
create policy "crono_sem_write" on cronograma_semanas for insert with check (tiene_permiso('gestionar_cronograma'));
create policy "crono_sem_update" on cronograma_semanas for update using (tiene_permiso('gestionar_cronograma'));
create policy "crono_sem_delete" on cronograma_semanas for delete using (tiene_permiso('gestionar_cronograma'));
