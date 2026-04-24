create table if not exists projects (
    id bigserial primary key,
    slug varchar(140) not null unique,
    name varchar(120) not null,
    description text,
    organization_id bigint not null references organizations (id),
    deadline date,
    completed_at timestamp,
    created_by_email varchar(255) references user_accounts (email),
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create index if not exists idx_projects_organization_id on projects (organization_id);
create index if not exists idx_projects_completed_at on projects (completed_at);
create index if not exists idx_projects_deadline on projects (deadline);

create table if not exists project_assets (
    id bigserial primary key,
    project_id bigint not null references projects (id) on delete cascade,
    asset_id bigint not null references assets (id) on delete cascade,
    linked_by_email varchar(255) references user_accounts (email),
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint uk_project_assets_project_asset unique (project_id, asset_id)
);

create index if not exists idx_project_assets_project_id on project_assets (project_id);
create index if not exists idx_project_assets_asset_id on project_assets (asset_id);
