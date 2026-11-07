export interface IngestionJob {
  documentId: string;
}

export interface JobPublisher {
  enqueue(job: IngestionJob): Promise<void>;
}

/**
 * What the worker tells the queue to do with a message:
 *  done  -> ack
 *  busy  -> another worker holds the document lock; try again later (attempt not consumed)
 *  retry -> failed, try again later (attempt consumed)
 *  dead  -> give up, move to the dead-letter queue
 */
export type JobOutcome = "done" | "busy" | "retry" | "dead";
