alter table assets
    add column image_art_style varchar(32),
    add column image_has_layer_file boolean,
    add column audio_tts_voice varchar(255),
    add column audio_recording_type varchar(32),
    add column video_stage varchar(32);
