create table asset_retention_policies (
    id bigserial primary key,
    trash_retention_days integer not null,
    restore_enabled boolean not null,
    updated_by_email varchar(255) not null,
    updated_by_name varchar(120),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

insert into asset_retention_policies (
    trash_retention_days,
    restore_enabled,
    updated_by_email,
    updated_by_name
) values (
    30,
    true,
    'system',
    '시스템'
);
