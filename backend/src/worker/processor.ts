import { RedisLocks } from "../clients/redis/redisEventPublisher.js";
import { DocumentRepositoryContract } from "../interface/documentRepository.interface.js";
import {
  IngestionJob,
  JobOutcome,
} from "../interface/jobPublisher.interface.js";
import { IngestionPipeline } from "../pipeline/documentIngestionPipeline/pipeline.js";
import { errorMessage, NonRetryableError } from "../utils/error.js";
import { log } from "../utils/logger.js";

export interface ProcessorDeps {
  pipeline: IngestionPipeline;
  documents: DocumentRepositoryContract;
  locks: RedisLocks;
  maxAttempts: number;
  lockTtlMs: number;
}

// run the the pipeline and update the outcome of the job : done,dead,busy and retry and also accounts the reason why job failed.
export function createJobProcessor(deps: ProcessorDeps) {
  return async function process(
    job: IngestionJob,
    attempt: number,
  ): Promise<JobOutcome> {
    console.log("[job processor started]");
    const { documentId } = job;

    const lock = await deps.locks.acquire(`doc:${documentId}`, deps.lockTtlMs);

    if (!lock) {
      log.info("document is being processed elsewhere, deferring", {
        documentId,
      });
      return "busy";
    }

    try {
      await deps.documents.incrementAttempts(documentId);

      await deps.pipeline.run(documentId);

      log.info("document ready", { documentId, attempt });
      return "done";
    } catch (err) {
      console.log("[job processor failed]");
      const permanent = err instanceof NonRetryableError;

      const exhausted = attempt + 1 >= deps.maxAttempts;

      log.error("pipeline failed", {
        documentId,
        attempt,
        permanent,
        err: errorMessage(err),
      });

      if (permanent || exhausted) {
        await deps.pipeline.markFailed(documentId, err);
        return "dead";
      }

      await deps.pipeline.markRetrying(documentId, err);
      return "retry";
    } finally {
      await lock
        .release()
        .catch((e) => log.warn("lock release failed", { err: String(e) }));
    }
  };
}
