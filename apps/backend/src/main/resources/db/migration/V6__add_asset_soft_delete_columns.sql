alter table assets
    add column deleted_at timestamp with time zone;

alter table assets
    add column deleted_by_email varchar(255);

alter table assets
    add column deleted_by_name varchar(120);

create index idx_assets_deleted_at on assets(deleted_at);
