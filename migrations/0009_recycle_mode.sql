CREATE TABLE IF NOT EXISTS insb_keepalive_new (
  machine_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES insb_accounts(id) ON DELETE RESTRICT,
  machine_name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'off' CHECK (mode IN ('off', 'always', 'windows', 'recycle')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  windows_json TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  action_id TEXT,
  last_checked_at INTEGER,
  last_state TEXT NOT NULL DEFAULT '',
  last_result TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
INSERT INTO insb_keepalive_new
  (machine_id,account_id,machine_name,mode,timezone,windows_json,version,action_id,last_checked_at,last_state,last_result,last_error,updated_at)
  SELECT machine_id,account_id,machine_name,mode,timezone,windows_json,version,action_id,last_checked_at,last_state,last_result,last_error,updated_at FROM insb_keepalive;
DROP TABLE insb_keepalive;
ALTER TABLE insb_keepalive_new RENAME TO insb_keepalive;
CREATE INDEX IF NOT EXISTS insb_keepalive_account ON insb_keepalive(account_id);
