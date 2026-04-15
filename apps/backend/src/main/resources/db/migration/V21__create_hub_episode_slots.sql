create table if not exists hub_series (
    id bigserial primary key,
    slug varchar(120) not null unique,
    name varchar(120) not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create table if not exists hub_levels (
    id bigserial primary key,
    series_id bigint not null references hub_series (id) on delete cascade,
    slug varchar(160) not null unique,
    name varchar(120) not null,
    sort_order integer not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create table if not exists hub_episodes (
    id bigserial primary key,
    level_id bigint not null references hub_levels (id) on delete cascade,
    slug varchar(200) not null unique,
    episode_code varchar(16) not null,
    name varchar(120) not null,
    description text,
    sort_order integer not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint uk_hub_episodes_level_episode_code unique (level_id, episode_code)
);

create table if not exists hub_episode_slots (
    id bigserial primary key,
    episode_id bigint not null references hub_episodes (id) on delete cascade,
    name varchar(120) not null,
    sort_order integer not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint uk_hub_episode_slots_episode_name unique (episode_id, name)
);

create table if not exists hub_episode_slot_assets (
    id bigserial primary key,
    slot_id bigint not null references hub_episode_slots (id) on delete cascade,
    asset_id bigint not null references assets (id) on delete cascade,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint uk_hub_episode_slot_assets_slot_asset unique (slot_id, asset_id)
);
