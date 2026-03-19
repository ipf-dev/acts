alter table asset_retention_policies
    drop column permanent_delete_enabled;

alter table asset_retention_policies
    drop column permanent_delete_requires_admin;
