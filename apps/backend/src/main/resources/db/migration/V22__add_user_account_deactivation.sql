alter table user_accounts add column deactivated_at timestamp with time zone;

create index idx_user_accounts_deactivated_at on user_accounts(deactivated_at);
