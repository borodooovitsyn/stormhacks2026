CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS gpu_metrics (
    ts TIMESTAMPTZ NOT NULL,
    worker_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    gpu_util_pct DOUBLE PRECISION NOT NULL CHECK (gpu_util_pct >= 0 AND gpu_util_pct <= 100),
    vram_used_mb INTEGER NOT NULL CHECK (vram_used_mb >= 0),
    cost_usd NUMERIC(12, 6) NOT NULL CHECK (cost_usd >= 0)
);

SELECT create_hypertable('gpu_metrics', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_gpu_metrics_worker_ts
    ON gpu_metrics (worker_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_gpu_metrics_job_ts
    ON gpu_metrics (job_id, ts DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS usage_per_minute
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', ts) AS bucket,
    worker_id,
    job_id,
    AVG(gpu_util_pct) AS avg_util,
    MAX(vram_used_mb) AS max_vram_mb,
    SUM(cost_usd) AS cost_usd
FROM gpu_metrics
GROUP BY bucket, worker_id, job_id
WITH NO DATA;

ALTER TABLE gpu_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'worker_id',
    timescaledb.compress_orderby = 'ts DESC'
);

DO $$
BEGIN
    PERFORM add_compression_policy('gpu_metrics', INTERVAL '1 day');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    PERFORM add_continuous_aggregate_policy(
        'usage_per_minute',
        start_offset => INTERVAL '1 day',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
