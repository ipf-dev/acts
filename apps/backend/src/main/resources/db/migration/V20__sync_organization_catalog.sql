create temporary table desired_organizations (
    name varchar(120) primary key
) on commit drop;

insert into desired_organizations (name)
values
    ('이사회'),
    ('리딩앤세일즈팀'),
    ('리딩앤마케팅팀'),
    ('리딩앤스쿨팀'),
    ('교육연수팀'),
    ('AI전략사업팀'),
    ('콘텐츠개발1팀'),
    ('콘텐츠개발2팀'),
    ('클라이언트개발팀'),
    ('기술연구소'),
    ('경영기획팀'),
    ('프로젝트허브팀'),
    ('서비스기획팀'),
    ('QA팀');

insert into organizations (name)
select d.name
from desired_organizations d
on conflict (name) do nothing;

update user_accounts
set organization_id = null,
    updated_at = current_timestamp
where organization_id in (
    select o.id
    from organizations o
    left join desired_organizations d on d.name = o.name
    where d.name is null
);

update assets
set organization_id = null,
    updated_at = current_timestamp
where organization_id in (
    select o.id
    from organizations o
    left join desired_organizations d on d.name = o.name
    where d.name is null
);

delete from organizations o
where not exists (
    select 1
    from desired_organizations d
    where d.name = o.name
);
