import { createContext, useContext, useEffect, useState } from "react";

export interface EventSourceOptions {
  init?: EventSourceInit;
  event?: string;
  enabled?: boolean;
}

export type EventSourceMap = Map<
  string,
  { count: number; source: EventSource }
>;

const context = createContext<EventSourceMap>(
  new Map<string, { count: number; source: EventSource }>(),
);

export const EventSourceProvider = context.Provider;

/**
 * Subscribe to an event source and return all queued events.
 * @param url The URL of the event source to connect to
 * @param options The options to pass to the EventSource constructor
 * @returns Array of events received since last render
 */
export function useEventSource(
  url: string | URL,
  { event = "message", init, enabled = true }: EventSourceOptions = {},
) {
  const map = useContext(context);
  const [eventQueue, setEventQueue] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const key = [url.toString(), init?.withCredentials].join("::");
    let value = map.get(key);

    if (!value) {
      value = {
        count: 0,
        source: new EventSource(url, init),
      };
      map.set(key, value);
    }

    ++value.count;

    function handler(messageEvent: MessageEvent) {
      const eventData = messageEvent.data || "UNKNOWN_EVENT_DATA";
      setEventQueue((prev) => [...prev, eventData]);
    }

    value.source.addEventListener(event, handler);
    setEventQueue([]);

    return () => {
      value.source.removeEventListener(event, handler);
      --value.count;

      if (value.count <= 0) {
        value.source.close();
        map.delete(key);
      }
    };
  }, [url, event, init, map, enabled]);

  return eventQueue;
}
