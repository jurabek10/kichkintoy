CREATE TABLE "cron_job_runs" (
    "id" UUID NOT NULL,
    "job_name" TEXT NOT NULL,
    "run_date" DATE NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'running',
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "cron_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cron_job_runs_job_name_run_date_key"
ON "cron_job_runs"("job_name", "run_date");
