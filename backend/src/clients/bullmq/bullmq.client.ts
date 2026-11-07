import { Worker, type Job, type ConnectionOptions, Queue } from "bullmq";

import {
  IngestionJob,
  JobOutcome,
  JobPublisher,
} from "../../interface/jobPublisher.interface.js";
import { log } from "../../utils/logger.js";

const JOBS_QUEUE = "ingestion.jobs";
const DEAD_QUEUE = "ingestion.dlq";

export interface BullMqOptions {
  connection: ConnectionOptions;
  retryDelayMs: number;
  maxAttempts: number;
}

export type JobHandler = (
  job: IngestionJob,
  attempt: number,
) => Promise<JobOutcome>;

export class BullMqQueue implements JobPublisher {
  private constructor(
    private readonly queue: Queue<IngestionJob>,
    private readonly deadQueue: Queue<IngestionJob>,
    private readonly opts: BullMqOptions,
  ) {}

  // connection and create two queues...
  static async connect(opts: BullMqOptions): Promise<BullMqQueue> {
    let bullMqQueueInstance: BullMqQueue | undefined;
    if (bullMqQueueInstance) return bullMqQueueInstance;
    const queue = new Queue<IngestionJob>(JOBS_QUEUE, {
      connection: opts.connection,
    });

    const deadQueue = new Queue<IngestionJob>(DEAD_QUEUE, {
      connection: opts.connection,
    });

    await Promise.all([queue.waitUntilReady(), deadQueue.waitUntilReady()]);

    bullMqQueueInstance = new BullMqQueue(queue, deadQueue, opts);

    return bullMqQueueInstance;
  }

  // adding a job in ingestion queue...
  async enqueue(job: IngestionJob): Promise<void> {
    await this.queue.add("ingestion", job, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  // pick a job from the ingestion queue and work on it...
  async consume(handler: JobHandler, concurrency: number): Promise<void> {
    console.log("[worker initiated]");
    const worker = new Worker<IngestionJob>(
      JOBS_QUEUE,
      async (job) => {
        console.log("got jobed")
        await this.handleJob(job, handler);
      },
      {
        connection: this.opts.connection,
        concurrency,
      },
    );

    worker.on("error", (err) => {
      log.error("bullmq worker error", {
        error: String(err),
      });
    });

    worker.on("failed", (job, err) => {
      log.error("bullmq job failed", {
        jobId: job?.id,
        error: String(err),
      });
    });

    log.info("consuming jobs", {
      queue: JOBS_QUEUE,
      concurrency,
    });
  }

  // drop the connection with queue, no long waiting...
  async close(): Promise<void> {
    await Promise.all([this.queue.close(), this.deadQueue.close()]);
  }

  // handle job and retry...
  private async handleJob(
    bullJob: Job<IngestionJob>,
    handler: JobHandler,
  ): Promise<void> {
    console.log("[job is picked]");
    const job = bullJob.data;

    // Validate the job and put if the job is invalid...
    if (typeof job.documentId !== "string") {
      log.error("invalid job, dead-lettering", {
        jobId: bullJob.id,
      });

      await this.deadQueue.add("dead", job);

      return;
    }

    // @ts-ignore
    const attempt = job.attempt ?? 0;

    let outcome: JobOutcome;

    try {
      outcome = await handler(job, attempt);
    } catch (err) {
      log.error("job handler threw unexpectedly", {
        documentId: job.documentId,
        error: String(err),
      });

      outcome = "retry";
    }

    // Maximum retry protection
    if (outcome === "retry" && attempt + 1 >= this.opts.maxAttempts) {
      outcome = "dead";
    }

    switch (outcome) {
      case "done":
        // Worker completes the BullMQ job automatically.
        break;

      case "busy":
        /*
         * Retry later WITHOUT increasing attempt.
         */

        console.log("[job is busy]");
        await this.queue.add(
          "ingestion",
          {
            ...job,
            // @ts-ignore
            attempt,
          },
          {
            delay: this.opts.retryDelayMs,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        break;

      case "retry":
        /*
         * Retry later and increase attempt.
         */
        console.log("[job is retried]");
        await this.queue.add(
          "ingestion",
          {
            ...job,
            // @ts-ignore
            attempt: attempt + 1,
          },
          {
            delay: this.opts.retryDelayMs,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        break;

      case "dead":
        console.log("[job is dead]");
        await this.deadQueue.add("dead", {
          ...job,
          // @ts-ignore
          attempt,
        });

        break;
    }
  }
}
