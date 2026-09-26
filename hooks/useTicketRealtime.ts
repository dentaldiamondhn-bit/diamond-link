'use client';

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket } from '@/types/ticket';

/**
 * Live ticket updates for the tickets pages.
 *
 * Requires the ticket tables to be on the `supabase_realtime` publication —
 * see `supabase/migrations/20260927000000_enable_tickets_realtime.sql`. Before
 * that migration existed the server rejected the whole channel with
 * "Unable to subscribe to changes with given parameters" and no event ever
 * arrived.
 *
 * WHY BOTH TABLES ARE BOUND: they carry different content. Status / priority /
 * assignee changes are UPDATEs on `tickets`; comments AND status-change entries
 * are INSERTs on `ticket_activities` (TicketService.updateTicket writes a
 * STATUS_CHANGE activity alongside the ticket UPDATE). Binding only `tickets`
 * leaves comments dead.
 *
 * A note on payload.old: on RLS-enabled tables Supabase ships only the primary
 * key even with REPLICA IDENTITY FULL (see database/migrations/LEDGER.md). So
 * "did the status actually change?" is answered against the previous row we
 * already hold, never against `payload.old.status`.
 *
 * INSERTs and new activities deliberately trigger a silent refetch rather than
 * splicing the raw row into state: a bare `tickets` row has no `assignees` /
 * `attachments` / `activities` / `creator`, and an activity has no `user`, so
 * merging them produces rows the UI cannot render. The refetch goes through
 * /api/tickets, which joins the relations and resolves Clerk identities
 * server-side — the same path the initial load uses. It is debounced so a
 * status change plus its activity row (two events) cost one request.
 */
const REFRESH_DEBOUNCE_MS = 400;

type TicketRow = Partial<Ticket> & { id: string };

export interface UseTicketRealtimeOptions {
  /** Clerk user id. Subscription is skipped until this resolves. */
  userId?: string;
  /** Current list, read inside callbacks so the channel never re-subscribes. */
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  /**
   * Silent reload of the ticket list. Must NOT flip the page-level `loading`
   * flag — both pages render a full-screen spinner while loading, so a realtime
   * event would blank the screen. Pass `() => loadTickets(true)`.
   */
  refresh: () => void | Promise<void>;
}

export function useTicketRealtime({
  userId,
  tickets,
  setTickets,
  refresh,
}: UseTicketRealtimeOptions) {
  // Keep the latest values reachable from the channel callbacks without making
  // them effect dependencies (which would tear down and rejoin the channel on
  // every list change). Synced in an effect rather than during render, and the
  // subscription effect is declared after these so it always reads fresh refs.
  const ticketsRef = useRef(tickets);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void refreshRef.current();
    }, REFRESH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const handleTicketChange = (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id as string | undefined;
        if (deletedId) {
          setTickets((prev) => prev.filter((t) => t.id !== deletedId));
        }
        return;
      }

      const row = payload.new as TicketRow | undefined;
      if (!row?.id) return;

      if (payload.eventType === 'INSERT') {
        // Needs the joined relations and the page's own role filter, neither of
        // which the bare row carries.
        scheduleRefresh();
        return;
      }

      const previous = ticketsRef.current.find((t) => t.id === row.id);
      if (!previous) {
        // Changed behind a filter this user can't see through (e.g. a ticket
        // that just became theirs). Nothing to merge; nothing to show.
        return;
      }

      if (previous.status !== row.status) {
        console.log(
          `Ticket ${row.ticket_number ?? row.id} status changed from ${previous.status} to ${row.status}`
        );
      }

      // Spreading the row over the existing ticket keeps assignees,
      // attachments, activities and the enriched creator/assignee intact —
      // the payload only carries `tickets` scalar columns.
      setTickets((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)));
    };

    const handleActivityInsert = (payload: {
      eventType: string;
      new: Record<string, unknown>;
    }) => {
      if (payload.eventType !== 'INSERT') return;
      const ticketId = payload.new?.ticket_id as string | undefined;
      if (!ticketId) return;
      // Ignore activity for tickets outside this user's filtered list; they
      // are not rendered, so refetching for them would be wasted work.
      if (!ticketsRef.current.some((t) => t.id === ticketId)) return;
      scheduleRefresh();
    };

    const channel = supabase
      .channel(`tickets-realtime-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        handleTicketChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_activities' },
        handleActivityInsert
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription established for tickets');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Real-time subscription problem for tickets: ${status}`);
        }
      });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [userId, setTickets, scheduleRefresh]);
}
