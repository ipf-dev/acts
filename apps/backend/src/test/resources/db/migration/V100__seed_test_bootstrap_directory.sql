insert into organizations (name)
values
    ('Content Test Org'),
    ('Marketing Test Org'),
    ('Strategy Test Org')
on conflict (name) do nothing;

insert into user_accounts (
    email,
    display_name,
    organization_id,
    role,
    mapping_mode,
    company_wide_viewer
)
values
    ('admin@example.test', 'Test Admin', null, 'ADMIN', 'UNMAPPED', true),
    ('catalog@example.test', 'Catalog User', null, 'USER', 'UNMAPPED', false)
on conflict (email) do update
set display_name = excluded.display_name,
    role = excluded.role,
    company_wide_viewer = excluded.company_wide_viewer,
    updated_at = current_timestamp;
