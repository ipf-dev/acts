create table user_feature_access (
    id bigserial primary key,
    user_email varchar(255) not null references user_accounts(email) on delete cascade,
    feature_key varchar(64) not null,
    allowed boolean not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint uq_user_feature_access unique (user_email, feature_key)
);

create index idx_user_feature_access_user_email on user_feature_access(user_email);
