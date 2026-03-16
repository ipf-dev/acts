create table assets (
    id bigserial primary key,
    title varchar(255) not null,
    asset_type varchar(32) not null,
    asset_status varchar(32) not null,
    description text,
    source_type varchar(32) not null,
    source_detail varchar(255),
    original_file_name varchar(255) not null,
    mime_type varchar(120) not null,
    file_size_bytes bigint not null,
    file_extension varchar(32),
    owner_email varchar(255) not null references user_accounts(email),
    owner_name varchar(120) not null,
    organization_id bigint references organizations(id),
    current_version_number integer not null,
    search_text text not null,
    width_px integer,
    height_px integer,
    duration_ms bigint,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp
);

create table asset_files (
    id bigserial primary key,
    asset_id bigint not null references assets(id) on delete cascade,
    version_number integer not null,
    bucket_name varchar(120) not null,
    object_key varchar(512) not null,
    original_file_name varchar(255) not null,
    mime_type varchar(120) not null,
    file_size_bytes bigint not null,
    checksum_sha256 varchar(64) not null,
    created_by_email varchar(255) not null references user_accounts(email),
    created_by_name varchar(120) not null,
    created_at timestamp with time zone not null default current_timestamp,
    unique (asset_id, version_number)
);

create table asset_tags (
    id bigserial primary key,
    asset_id bigint not null references assets(id) on delete cascade,
    tag_value varchar(80) not null,
    normalized_value varchar(80) not null,
    source varchar(16) not null,
    created_at timestamp with time zone not null default current_timestamp,
    unique (asset_id, normalized_value)
);

create table asset_events (
    id bigserial primary key,
    asset_id bigint not null references assets(id) on delete cascade,
    event_type varchar(32) not null,
    actor_email varchar(255) not null references user_accounts(email),
    actor_name varchar(120),
    detail text,
    created_at timestamp with time zone not null default current_timestamp
);

create index idx_assets_created_at on assets(created_at desc, id desc);
create index idx_assets_type on assets(asset_type);
create index idx_assets_owner_email on assets(owner_email);
create index idx_assets_organization_id on assets(organization_id);
create index idx_asset_tags_asset_id on asset_tags(asset_id);
create index idx_asset_tags_normalized_value on asset_tags(normalized_value);
create index idx_asset_events_asset_id on asset_events(asset_id, created_at desc);
