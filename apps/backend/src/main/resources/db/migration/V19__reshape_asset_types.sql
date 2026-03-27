update assets
set
    asset_type = 'DOCUMENT',
    document_kind = coalesce(document_kind, 'SCENARIO')
where asset_type = 'SCENARIO';

update assets
set asset_type = 'URL'
where source_kind = 'LINK';
