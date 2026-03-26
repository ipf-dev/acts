create table character_tags (
    id bigserial primary key,
    name varchar(80) not null,
    normalized_name varchar(80) not null,
    created_by_email varchar(255) not null references user_accounts(email),
    updated_by_email varchar(255) not null references user_accounts(email),
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    unique (normalized_name)
);

create table character_tag_aliases (
    id bigserial primary key,
    character_tag_id bigint not null references character_tags(id) on delete cascade,
    alias_value varchar(80) not null,
    normalized_alias_value varchar(80) not null,
    created_at timestamp with time zone not null default current_timestamp,
    unique (normalized_alias_value),
    unique (character_tag_id, normalized_alias_value)
);

alter table asset_tags
    add column if not exists tag_type varchar(32) not null default 'KEYWORD';

alter table asset_tags
    drop constraint if exists asset_tags_asset_id_normalized_value_key;

alter table asset_tags
    add constraint uk_asset_tags_asset_type_value unique (asset_id, tag_type, normalized_value);

create index if not exists idx_asset_tags_type_normalized_value on asset_tags(tag_type, normalized_value);
create index if not exists idx_character_tags_normalized_name on character_tags(normalized_name);
create index if not exists idx_character_tag_aliases_normalized_value on character_tag_aliases(normalized_alias_value);
