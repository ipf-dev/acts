alter table asset_files
    alter column checksum_sha256 drop not null;
