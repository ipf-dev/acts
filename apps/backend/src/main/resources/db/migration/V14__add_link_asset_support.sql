alter table assets
    add column if not exists source_kind varchar(16) not null default 'FILE',
    add column if not exists link_url text,
    add column if not exists link_type varchar(120);

create index if not exists idx_assets_source_kind on assets(source_kind);
