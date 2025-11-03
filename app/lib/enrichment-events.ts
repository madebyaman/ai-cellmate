/**
 * Type definitions for real-time CSV enrichment events
 * These events are published to Redis and streamed to clients via SSE
 */

export interface RowStartEvent {
  type: "row-start";
  rowId: string;
  rowPosition: number;
  timestamp: string;
}

export interface StageStartEvent {
  type: "stage-start";
  stage: string;
  timestamp: string;
}

export interface StageCompleteEvent {
  type: "stage-complete";
  stage: string;
  timestamp: string;
}

export interface CellUpdateEvent {
  type: "cell-update";
  rowId: string;
  columnId: string;
  columnName: string;
  value: string;
  timestamp: string;
}

export interface RowCompleteEvent {
  type: "row-complete";
  rowId: string;
  rowPosition: number;
  columnsFilled: number;
  columnsTotal: number;
  timestamp: string;
}

export interface RowRetryingEvent {
  type: "row-retrying";
  rowId: string;
  rowPosition: number;
  columnsFilled: number;
  columnsTotal: number;
  cycle: number; // Keep cycle for row-retrying as it's essential
  timestamp: string;
}

export interface RowFailedEvent {
  type: "row-failed";
  rowId: string;
  rowPosition: number;
  reason: string;
  timestamp: string;
}

export interface RowSkippedEvent {
  type: "row-skipped";
  rowId: string;
  rowPosition: number;
  reason: string;
  timestamp: string;
}

export interface CompleteEvent {
  type: "complete";
  timestamp: string;
}

export interface CancelledEvent {
  type: "cancelled";
  reason: string;
  timestamp: string;
}

export interface InsufficientCreditsEvent {
  type: "insufficient-credits";
  message: string;
  creditsRemaining: number;
  timestamp: string;
}

export type EnrichmentEvent =
  | RowStartEvent
  | StageStartEvent
  | StageCompleteEvent
  | CellUpdateEvent
  | RowCompleteEvent
  | RowRetryingEvent
  | RowFailedEvent
  | RowSkippedEvent
  | CompleteEvent
  | CancelledEvent
  | InsufficientCreditsEvent;

/**
 * Helper function to create enrichment events with timestamp
 */
export function createEnrichmentEvent<T extends EnrichmentEvent["type"]>(
  type: T,
  data: Omit<Extract<EnrichmentEvent, { type: T }>, "type" | "timestamp">,
): Extract<EnrichmentEvent, { type: T }> {
  return {
    type,
    ...data,
    timestamp: new Date().toISOString(),
  } as Extract<EnrichmentEvent, { type: T }>;
}
