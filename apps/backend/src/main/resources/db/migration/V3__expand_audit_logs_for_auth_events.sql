alter table admin_audit_logs rename to audit_logs;

alter table audit_logs add column category varchar(32);
update audit_logs set category = 'PERMISSION' where category is null;
alter table audit_logs alter column category set not null;

alter table audit_logs add column outcome varchar(16);
update audit_logs set outcome = 'SUCCESS' where outcome is null;
alter table audit_logs alter column outcome set not null;

alter table audit_logs add column actor_name varchar(120);
update audit_logs set actor_name = actor_email where actor_name is null;

alter table audit_logs add column target_name varchar(120);
alter table audit_logs add column detail text;
update audit_logs
set detail = case
    when action_type = 'USER_ASSIGNMENT_UPDATED' then '사용자 조직 정보가 변경되었습니다.'
    when action_type = 'VIEWER_ALLOWLIST_ADDED' then '전사 열람자 allowlist에 사용자가 추가되었습니다.'
    when action_type = 'VIEWER_ALLOWLIST_REMOVED' then '전사 열람자 allowlist에서 사용자가 제거되었습니다.'
    else action_type
end
where detail is null;
