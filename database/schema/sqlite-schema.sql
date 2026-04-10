CREATE TABLE IF NOT EXISTS "migrations"(
  "id" integer primary key autoincrement not null,
  "migration" varchar not null,
  "batch" integer not null
);
CREATE TABLE IF NOT EXISTS "users"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "email" varchar not null,
  "email_verified_at" datetime,
  "password" varchar not null,
  "remember_token" varchar,
  "created_at" datetime,
  "updated_at" datetime,
  "two_factor_secret" text,
  "two_factor_recovery_codes" text,
  "two_factor_confirmed_at" datetime,
  "is_admin" tinyint(1) not null default '0',
  "suspended_at" datetime
);
CREATE UNIQUE INDEX "users_email_unique" on "users"("email");
CREATE TABLE IF NOT EXISTS "password_reset_tokens"(
  "email" varchar not null,
  "token" varchar not null,
  "created_at" datetime,
  primary key("email")
);
CREATE TABLE IF NOT EXISTS "sessions"(
  "id" varchar not null,
  "user_id" integer,
  "ip_address" varchar,
  "user_agent" text,
  "payload" text not null,
  "last_activity" integer not null,
  primary key("id")
);
CREATE INDEX "sessions_user_id_index" on "sessions"("user_id");
CREATE INDEX "sessions_last_activity_index" on "sessions"("last_activity");
CREATE TABLE IF NOT EXISTS "cache"(
  "key" varchar not null,
  "value" text not null,
  "expiration" integer not null,
  primary key("key")
);
CREATE INDEX "cache_expiration_index" on "cache"("expiration");
CREATE TABLE IF NOT EXISTS "cache_locks"(
  "key" varchar not null,
  "owner" varchar not null,
  "expiration" integer not null,
  primary key("key")
);
CREATE INDEX "cache_locks_expiration_index" on "cache_locks"("expiration");
CREATE TABLE IF NOT EXISTS "jobs"(
  "id" integer primary key autoincrement not null,
  "queue" varchar not null,
  "payload" text not null,
  "attempts" integer not null,
  "reserved_at" integer,
  "available_at" integer not null,
  "created_at" integer not null
);
CREATE INDEX "jobs_queue_index" on "jobs"("queue");
CREATE TABLE IF NOT EXISTS "job_batches"(
  "id" varchar not null,
  "name" varchar not null,
  "total_jobs" integer not null,
  "pending_jobs" integer not null,
  "failed_jobs" integer not null,
  "failed_job_ids" text not null,
  "options" text,
  "cancelled_at" integer,
  "created_at" integer not null,
  "finished_at" integer,
  primary key("id")
);
CREATE TABLE IF NOT EXISTS "failed_jobs"(
  "id" integer primary key autoincrement not null,
  "uuid" varchar not null,
  "connection" text not null,
  "queue" text not null,
  "payload" text not null,
  "exception" text not null,
  "failed_at" datetime not null default CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "failed_jobs_uuid_unique" on "failed_jobs"("uuid");
CREATE TABLE IF NOT EXISTS "user_activities"(
  "id" integer primary key autoincrement not null,
  "user_id" integer not null,
  "action" varchar not null,
  "route_name" varchar,
  "method" varchar not null,
  "path" varchar not null,
  "status_code" integer,
  "user_agent" text,
  "context" text,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("user_id") references "users"("id") on delete cascade
);
CREATE INDEX "user_activities_user_id_created_at_index" on "user_activities"(
  "user_id",
  "created_at"
);
CREATE TABLE IF NOT EXISTS "passkeys"(
  "id" integer primary key autoincrement not null,
  "user_id" integer not null,
  "name" varchar not null,
  "credential_id" varchar not null,
  "public_key" text not null,
  "aaguid" varchar,
  "transports" text,
  "counter" integer not null default '0',
  "last_used_at" datetime,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("user_id") references "users"("id") on delete cascade
);
CREATE UNIQUE INDEX "passkeys_credential_id_unique" on "passkeys"(
  "credential_id"
);
CREATE TABLE IF NOT EXISTS "locations"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "country" varchar not null,
  "created_at" datetime,
  "updated_at" datetime
);
CREATE UNIQUE INDEX "locations_name_unique" on "locations"("name");
CREATE TABLE IF NOT EXISTS "nodes"(
  "id" integer primary key autoincrement not null,
  "location_id" integer not null,
  "name" varchar not null,
  "fqdn" varchar not null,
  "daemon_port" integer not null default '2800',
  "sftp_port" integer not null default '3128',
  "use_ssl" tinyint(1) not null default '0',
  "created_at" datetime,
  "updated_at" datetime,
  "status" varchar not null default 'draft',
  "daemon_uuid" varchar,
  "daemon_version" varchar,
  "enrolled_at" datetime,
  "last_seen_at" datetime,
  foreign key("location_id") references "locations"("id") on delete cascade
);
CREATE UNIQUE INDEX "nodes_name_unique" on "nodes"("name");
CREATE UNIQUE INDEX "nodes_fqdn_unique" on "nodes"("fqdn");
CREATE UNIQUE INDEX "nodes_daemon_uuid_unique" on "nodes"("daemon_uuid");
CREATE TABLE IF NOT EXISTS "node_credentials"(
  "id" integer primary key autoincrement not null,
  "node_id" integer not null,
  "enrollment_token_hash" varchar,
  "enrollment_expires_at" datetime,
  "enrollment_used_at" datetime,
  "daemon_secret_hash" varchar,
  "daemon_secret_issued_at" datetime,
  "created_at" datetime,
  "updated_at" datetime,
  "daemon_callback_token" text,
  foreign key("node_id") references "nodes"("id") on delete cascade
);
CREATE UNIQUE INDEX "node_credentials_node_id_unique" on "node_credentials"(
  "node_id"
);
CREATE UNIQUE INDEX "node_credentials_enrollment_token_hash_unique" on "node_credentials"(
  "enrollment_token_hash"
);
CREATE UNIQUE INDEX "node_credentials_daemon_secret_hash_unique" on "node_credentials"(
  "daemon_secret_hash"
);
CREATE TABLE IF NOT EXISTS "cargos"(
  "id" integer primary key autoincrement not null,
  "name" varchar not null,
  "slug" varchar not null,
  "author" varchar not null,
  "description" text,
  "source_type" varchar not null default 'native',
  "cargofile" text not null,
  "definition" text not null,
  "created_at" datetime,
  "updated_at" datetime,
  "features" text,
  "docker_images" text,
  "file_denylist" text,
  "file_hidden_list" text,
  "startup_command" text,
  "config_files" text,
  "config_startup" text,
  "config_logs" text,
  "config_stop" text,
  "install_script" text,
  "install_container" text,
  "install_entrypoint" varchar,
  "variables" text
);
CREATE UNIQUE INDEX "cargos_name_unique" on "cargos"("name");
CREATE UNIQUE INDEX "cargos_slug_unique" on "cargos"("slug");
CREATE TABLE IF NOT EXISTS "app_settings"(
  "id" integer primary key autoincrement not null,
  "key" varchar not null,
  "value" text,
  "created_at" datetime,
  "updated_at" datetime
);
CREATE UNIQUE INDEX "app_settings_key_unique" on "app_settings"("key");
CREATE TABLE IF NOT EXISTS "servers"(
  "id" integer primary key autoincrement not null,
  "user_id" integer not null,
  "node_id" integer not null,
  "cargo_id" integer not null,
  "name" varchar not null,
  "memory_mib" integer not null,
  "cpu_limit" integer not null default('0'),
  "disk_mib" integer not null,
  "status" varchar not null default('pending'),
  "created_at" datetime,
  "updated_at" datetime,
  "allocation_id" integer,
  "last_error" text,
  "docker_image" varchar,
  "startup_command_override" varchar,
  "docker_image_override" varchar,
  "backup_limit" integer not null default '0',
  "allocation_limit" integer,
  foreign key("cargo_id") references cargos("id") on delete cascade on update no action,
  foreign key("node_id") references nodes("id") on delete cascade on update no action,
  foreign key("user_id") references users("id") on delete cascade on update no action,
  foreign key("allocation_id") references "allocations"("id") on delete set null
);
CREATE INDEX "servers_name_index" on "servers"("name");
CREATE INDEX "servers_status_index" on "servers"("status");
CREATE TABLE IF NOT EXISTS "allocations"(
  "id" integer primary key autoincrement not null,
  "node_id" integer not null,
  "bind_ip" varchar not null default('0.0.0.0'),
  "port" integer not null,
  "ip_alias" varchar,
  "created_at" datetime,
  "updated_at" datetime,
  "server_id" integer,
  foreign key("node_id") references nodes("id") on delete cascade on update no action,
  foreign key("server_id") references "servers"("id") on delete set null
);
CREATE UNIQUE INDEX "allocations_node_id_bind_ip_port_unique" on "allocations"(
  "node_id",
  "bind_ip",
  "port"
);
CREATE TABLE IF NOT EXISTS "firewall_rules"(
  "id" integer primary key autoincrement not null,
  "server_id" integer not null,
  "direction" varchar check("direction" in('inbound', 'outbound')) not null,
  "action" varchar check("action" in('allow', 'deny')) not null,
  "protocol" varchar check("protocol" in('tcp', 'udp', 'icmp')) not null,
  "source" varchar not null default '0.0.0.0/0',
  "port_start" integer,
  "port_end" integer,
  "notes" varchar,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("server_id") references "servers"("id") on delete cascade
);
CREATE INDEX "firewall_rules_server_id_direction_index" on "firewall_rules"(
  "server_id",
  "direction"
);
CREATE TABLE IF NOT EXISTS "interconnect_server"(
  "id" integer primary key autoincrement not null,
  "interconnect_id" integer not null,
  "server_id" integer not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("interconnect_id") references "interconnects"("id") on delete cascade,
  foreign key("server_id") references "servers"("id") on delete cascade
);
CREATE UNIQUE INDEX "interconnect_server_interconnect_id_server_id_unique" on "interconnect_server"(
  "interconnect_id",
  "server_id"
);
CREATE TABLE IF NOT EXISTS "interconnects"(
  "id" integer primary key autoincrement not null,
  "user_id" integer not null,
  "node_id" integer not null,
  "name" varchar not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("user_id") references "users"("id") on delete cascade,
  foreign key("node_id") references "nodes"("id") on delete cascade
);
CREATE UNIQUE INDEX "interconnects_user_id_node_id_name_unique" on "interconnects"(
  "user_id",
  "node_id",
  "name"
);
CREATE TABLE IF NOT EXISTS "server_users"(
  "id" integer primary key autoincrement not null,
  "server_id" integer not null,
  "user_id" integer not null,
  "permissions" text not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("server_id") references "servers"("id") on delete cascade,
  foreign key("user_id") references "users"("id") on delete cascade
);
CREATE UNIQUE INDEX "server_users_server_id_user_id_unique" on "server_users"(
  "server_id",
  "user_id"
);
CREATE TABLE IF NOT EXISTS "backups"(
  "id" integer primary key autoincrement not null,
  "server_id" integer not null,
  "name" varchar not null,
  "uuid" varchar not null,
  "size_bytes" integer not null default '0',
  "checksum" varchar,
  "status" varchar check("status" in('creating', 'completed', 'failed', 'restoring')) not null default 'creating',
  "error" text,
  "completed_at" datetime,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("server_id") references "servers"("id") on delete cascade
);
CREATE INDEX "backups_server_id_status_index" on "backups"(
  "server_id",
  "status"
);
CREATE UNIQUE INDEX "backups_uuid_unique" on "backups"("uuid");
CREATE TABLE IF NOT EXISTS "workflows"(
  "id" integer primary key autoincrement not null,
  "server_id" integer not null,
  "name" varchar not null,
  "enabled" tinyint(1) not null default '1',
  "nodes" text not null,
  "edges" text not null,
  "created_at" datetime,
  "updated_at" datetime,
  foreign key("server_id") references "servers"("id") on delete cascade
);

INSERT INTO migrations VALUES(1,'0001_01_01_000000_create_users_table',1);
INSERT INTO migrations VALUES(2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO migrations VALUES(3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO migrations VALUES(4,'2025_08_14_170933_add_two_factor_columns_to_users_table',1);
INSERT INTO migrations VALUES(5,'2026_03_18_121754_add_billing_fields_to_users_table',2);
INSERT INTO migrations VALUES(6,'2026_03_18_122656_add_region_fields_to_users_table',3);
INSERT INTO migrations VALUES(7,'2026_03_18_132253_create_user_activities_table',4);
INSERT INTO migrations VALUES(8,'2026_03_18_191848_add_admin_and_suspended_to_users_table',5);
INSERT INTO migrations VALUES(9,'2026_03_20_131818_create_passkeys_table',6);
INSERT INTO migrations VALUES(10,'2026_03_20_173909_add_preferred_currency_overridden_to_users_table',7);
INSERT INTO migrations VALUES(11,'2026_03_27_123706_drop_billing_and_location_columns_from_users_table',8);
INSERT INTO migrations VALUES(12,'2026_03_27_123706_drop_location_columns_from_user_activities_table',8);
INSERT INTO migrations VALUES(13,'2026_04_05_131626_create_locations_table',9);
INSERT INTO migrations VALUES(14,'2026_04_05_131626_create_nodes_table',9);
INSERT INTO migrations VALUES(15,'2026_04_05_173936_add_enrollment_fields_to_nodes_table',10);
INSERT INTO migrations VALUES(16,'2026_04_05_173936_create_node_credentials_table',10);
INSERT INTO migrations VALUES(17,'2026_04_05_181601_add_last_seen_at_to_nodes_table',10);
INSERT INTO migrations VALUES(18,'2026_04_05_200258_add_daemon_callback_token_to_node_credentials_table',11);
INSERT INTO migrations VALUES(19,'2026_04_05_203019_create_cargos_table',12);
INSERT INTO migrations VALUES(20,'2026_04_05_222428_create_app_settings_table',13);
INSERT INTO migrations VALUES(21,'2026_04_06_095046_add_runtime_fields_to_cargos_table',14);
INSERT INTO migrations VALUES(22,'2026_04_06_103743_create_servers_table',15);
INSERT INTO migrations VALUES(23,'2026_04_06_110936_create_allocations_table',16);
INSERT INTO migrations VALUES(24,'2026_04_06_111008_add_allocation_id_to_servers_table',16);
INSERT INTO migrations VALUES(25,'2026_04_06_150237_add_last_error_to_servers_table',17);
INSERT INTO migrations VALUES(26,'2026_04_07_012215_remove_admin_notes_from_users_table',18);
INSERT INTO migrations VALUES(27,'2026_04_08_111017_add_docker_image_to_servers_table',19);
INSERT INTO migrations VALUES(28,'2026_04_10_111158_add_server_id_to_allocations_table',20);
INSERT INTO migrations VALUES(29,'2026_04_10_113844_create_firewall_rules_table',21);
INSERT INTO migrations VALUES(30,'2026_04_10_150311_create_interconnect_server_table',22);
INSERT INTO migrations VALUES(31,'2026_04_10_150311_create_interconnects_table',22);
INSERT INTO migrations VALUES(32,'2026_04_10_160218_create_server_users_table',23);
INSERT INTO migrations VALUES(33,'2026_04_10_162906_add_admin_startup_overrides_to_servers_table',24);
INSERT INTO migrations VALUES(34,'2026_04_10_171739_add_backup_limit_to_servers_table',25);
INSERT INTO migrations VALUES(35,'2026_04_10_171739_create_backups_table',25);
INSERT INTO migrations VALUES(36,'2026_04_10_171740_add_allocation_limit_to_servers_table',25);
INSERT INTO migrations VALUES(37,'2026_04_10_174350_create_workflows_table',26);
