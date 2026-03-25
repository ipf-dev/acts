alter table assets
    drop column if exists source_type,
    drop column if exists source_detail;
