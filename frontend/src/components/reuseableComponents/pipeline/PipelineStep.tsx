import { useEffect, useState } from "react";

export const PIPELINE_STEPS = [
  "Parsing",
  "Chunking",
  "Embedding",
  "Uploading embeddings",
];

type Status = "pending" | "active" | "done" | "failed";

type Props = {
  steps?: string[];

  /** Index of the running step. steps.length = everything done. */
  current: number;

  /** Index of the step that failed. When set, `current` is ignored. */
  failedAt?: number | null;

  /** Shown under the stepper when a step fails. */
  error?: string;

  /** If provided, a Retry button appears on failure. */
  onRetry?: () => void;

  /** If provided, a close (✕) button appears on hover. */
  onClose?: () => void;
};

/**
 * Animation choreography when a step finishes:
 *   0ms     check draws in on the finished step
 *   200ms   connector line starts filling toward the next step
 *   550ms   next step lights up (spinner fades in)
 */

const LINE_DELAY = 200;
const LINE_MS = 350;
const NEXT_DELAY = LINE_DELAY + LINE_MS;

const CAPTIONS: Record<Status, string> = {
  done: "Completed",
  active: "In progress…",
  failed: "Failed",
  pending: "Waiting",
};

const RING: Record<Status, string> = {
  done: "border-emerald-500 bg-emerald-500",
  active: "border-amber-500 bg-white",
  failed: "border-red-500 bg-red-500",
  pending: "border-slate-300 bg-white",
};

const LABEL: Record<Status, string> = {
  done: "text-emerald-600",
  active: "text-amber-600",
  failed: "text-red-600",
  pending: "text-slate-400",
};

/** Renders on a white/light background. Responsive and centered. */
export function PipelineSteps({
  steps = PIPELINE_STEPS,
  current,
  failedAt = null,
  error,
  onRetry,
  onClose,
}: Props) {
  if (steps.length === 0) return null;

  // clamp bad input so the UI never breaks
  const safeCurrent = Math.min(Math.max(current, 0), steps.length);

  const failed =
    failedAt === null
      ? null
      : Math.min(Math.max(failedAt, 0), steps.length - 1);

  const statusOf = (i: number): Status => {
    if (failed !== null) {
      return i < failed ? "done" : i === failed ? "failed" : "pending";
    }

    return i < safeCurrent ? "done" : i === safeCurrent ? "active" : "pending";
  };

  const allDone = failed === null && safeCurrent >= steps.length;

  return (
    <div className="group relative  flex w-full  flex-col justify-between items-center gap-5 bg-gray-100 px-2 pt-6 sm:gap-6 sm:px-4">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="
            absolute right-0 top-0
            flex h-7 w-7 items-center justify-center
            rounded-full
            text-slate-400
            opacity-0
            transition-all duration-200
            hover:bg-red-50
            hover:text-red-600
            focus-visible:opacity-100
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-red-500
            group-hover:opacity-100
            [@media(hover:none)]:opacity-100
          "
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}

      <ol className="flex w-full justify-center items-center">
        {steps.map((label, i) => {
          const status = statusOf(i);
          const isLast = i === steps.length - 1;

          // lights up only after the connector reaches it
          const lightUpDelay =
            i > 0 && (status === "active" || status === "failed")
              ? NEXT_DELAY
              : 0;

          const delayStyle = {
            transitionDelay: `${lightUpDelay}ms`,
          };

          return (
            <li
              key={label}
              className="
                relative
                flex
                min-w-0
                flex-1
                flex-col
                items-center
              "
            >
              {/* Connector */}
              {!isLast && (
                <div
                  className="
                    absolute
                    top-3
                    h-0.5
                    -translate-y-1/2
                    overflow-hidden
                    rounded-full
                    bg-slate-200

                    left-[calc(50%+0.875rem)]
                    w-[calc(100%-1.75rem)]

                    sm:left-[calc(50%+1.25rem)]
                    sm:w-[calc(100%-2.5rem)]
                  "
                >
                  <div
                    className="
                      h-full
                      origin-left
                      bg-emerald-500
                      transition-transform
                      ease-in-out
                      will-change-transform
                      motion-reduce:transition-none
                    "
                    style={{
                      transform: `scaleX(${status === "done" ? 1 : 0})`,
                      transitionDuration: `${LINE_MS}ms`,
                      transitionDelay:
                        status === "done" ? `${LINE_DELAY}ms` : "0ms",
                    }}
                  />
                </div>
              )}

              {/* Circle */}
              <div
                role="img"
                aria-label={`${label}: ${CAPTIONS[status]}`}
                style={delayStyle}
                className={`
                  relative
                  z-10
                  flex
                  h-6
                  w-6
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  transition-[background-color,border-color]
                  duration-300
                  ease-out
                  motion-reduce:transition-none

                  sm:h-8
                  sm:w-8

                  ${RING[status]}
                `}
              >
                {/* Spinner */}
                <span
                  style={delayStyle}
                  className={`
                    absolute
                    h-3
                    w-3
                    animate-spin
                    rounded-full
                    border-2
                    border-amber-500
                    border-t-transparent
                    transition-opacity
                    duration-200
                    motion-reduce:transition-none

                    sm:h-4
                    sm:w-4

                    ${status === "active" ? "opacity-100" : "opacity-0"}
                  `}
                />

                {/* Check */}
                <svg
                  viewBox="0 0 24 24"
                  className="
                    absolute
                    h-3
                    w-3
                    text-white
                    sm:h-4
                    sm:w-4
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={status === "done" ? 0 : 1}
                    style={{
                      transition: "stroke-dashoffset 300ms ease-out",
                    }}
                  />
                </svg>

                {/* Cross */}
                <svg
                  viewBox="0 0 24 24"
                  className="
                    absolute
                    h-3
                    w-3
                    text-white
                    sm:h-4
                    sm:w-4
                  "
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={status === "failed" ? 0 : 1}
                    style={{
                      transition: "stroke-dashoffset 300ms ease-out",
                      transitionDelay:
                        status === "failed" ? `${lightUpDelay + 150}ms` : "0ms",
                    }}
                  />
                </svg>
              </div>

              {/* Label */}
              <p
                style={delayStyle}
                className={`
                  mt-2
                  max-w-full
                  truncate
                  px-0.5
                  text-center
                  text-[10px]
                  font-medium
                  leading-tight
                  transition-colors
                  duration-300
                  motion-reduce:transition-none

                  sm:px-1
                  sm:text-sm

                  ${LABEL[status]}
                `}
              >
                {label}
              </p>

              {/* Caption */}
              <div className="relative mt-0.5 h-4 w-full">
                {(Object.keys(CAPTIONS) as Status[]).map((s) => (
                  <span
                    key={s}
                    style={{
                      transitionDelay:
                        s === status ? `${lightUpDelay}ms` : "0ms",
                    }}
                    className={`
                        absolute
                        inset-0
                        truncate
                        text-center
                        text-[9px]
                        text-slate-500
                        transition-opacity
                        duration-300
                        motion-reduce:transition-none

                        sm:text-[11px]

                        ${s === status ? "opacity-100" : "opacity-0"}
                      `}
                  >
                    {CAPTIONS[s]}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Reserved height so nothing jumps when messages appear */}
      <div className="flex min-h-[5.5rem] w-full flex-col items-center justify-start px-2">
        {allDone && (
          <p
            className="
              animate-[fadeIn_400ms_ease-out_600ms_both]
              text-center
              text-sm
              font-medium
              text-emerald-600
            "
            role="status"
          >
            All steps completed
          </p>
        )}

        {failed !== null && (
          <div
            role="alert"
            className="
              flex
              w-full
              animate-[fadeIn_300ms_ease-out_500ms_both]
              flex-col
              items-center
              gap-3
              text-center
            "
          >
            <p className="max-w-md text-sm text-red-600">
              {steps[failed]} failed
              {error ? `: ${error}` : "."}
            </p>

            {onRetry && (
              <button
                onClick={onRetry}
                className="
                  rounded-md
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-1.5
                  text-sm
                  font-medium
                  text-red-600
                  transition-colors
                  hover:bg-red-100
                  hover:text-red-700
                "
              >
                Retry {steps[failed].toLowerCase()}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }

          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
