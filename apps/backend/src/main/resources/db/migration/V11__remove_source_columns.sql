alter table assets
    drop column if exists source_type;

alter table assets
    drop column if exists source_detail;
