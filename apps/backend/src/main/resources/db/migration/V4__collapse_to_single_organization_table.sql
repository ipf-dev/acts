alter table user_accounts drop constraint if exists user_accounts_department_id_fkey;
alter table user_accounts drop constraint if exists user_accounts_team_id_fkey;
alter table teams drop constraint if exists teams_department_id_fkey;

alter table user_accounts drop column if exists department_id;
alter table teams drop column if exists department_id;

alter table user_accounts rename column team_id to organization_id;
alter table teams rename to organizations;

alter table user_accounts add constraint user_accounts_organization_id_fkey
    foreign key (organization_id) references organizations(id);

drop table departments;
