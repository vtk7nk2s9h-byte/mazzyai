'use client';

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import moment from 'moment';
import {
  Calendar,
  momentLocalizer,
  Views,
  type SlotInfo,
  type View,
} from 'react-big-calendar';
import withDragAndDrop, {
  type DragFromOutsideItemArgs,
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '@/app/ui/agenda/calendar.css';

import {
  createMeeting,
  rescheduleMeeting,
  updateMeeting,
  type UpdateMeetingInput,
} from '@/app/lib/meeting-actions';
import { MeetingStatusBadge } from '@/app/ui/organizations/status';
import { toastError, toastSuccess } from '@/hooks/use-toast';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop<AgendaEvent>(Calendar);

/** A MeetingRow from meeting-data.ts, with the dates still ISO strings. */
export type AgendaMeeting = {
  id: string;
  title: string;
  description: string | null;
  attendeeName: string | null;
  agent: { name: string } | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  status: string;
};

type AgendaEvent = Omit<AgendaMeeting, 'startsAt' | 'endsAt'> & {
  start: Date;
  end: Date;
};

/** What the create form opens with: a time range, or whole days. */
type Draft = { start: Date; end: Date; allDay: boolean };

const input =
  'block w-full rounded-md border border-gray-200 bg-transparent px-3 py-[9px] text-sm outline-2 placeholder:text-gray-500';
const label = 'mb-1.5 block text-xs font-medium text-gray-900';
const dialogClass =
  'w-[min(92vw,26rem)] rounded-lg border border-white/[0.07] bg-[#140a0d]/80 p-0 text-gray-900 backdrop-blur-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm';

/** Next full hour, for an hour — where "Create event" starts. */
function defaultDraft(): Draft {
  const start = moment().add(1, 'hour').startOf('hour');
  return { start: start.toDate(), end: start.clone().add(1, 'hour').toDate(), allDay: false };
}

/**
 * The organization's meetings on react-big-calendar (the shadcn-ui-big-calendar
 * recipe): month, week, day and agenda views, themed in calendar.css.
 * Clicking a meeting opens its details, and "Create event" (or dragging out a
 * slot) opens the form. Both are native <dialog>s, which give the modal, the
 * blurred ::backdrop, Escape-to-close and focus handling with no state of
 * their own.
 */
export default function AgendaCalendar({
  organizationId,
  meetings,
  heading,
}: {
  organizationId: string;
  meetings: AgendaMeeting[];
  /** The section title, so Create event can sit on its line. */
  heading?: ReactNode;
}) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(() => new Date());
  const [selected, setSelected] = useState<AgendaEvent | null>(null);
  // The meeting the form is editing; null when it is creating one.
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  // A meeting picked up from the "+N more" popup, which the calendar reports
  // through handleDragStart and then drops like an item from outside it.
  const dragged = useRef<AgendaEvent | null>(null);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const details = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLDialogElement>(null);

  // The calendar lays out in the viewer's timezone, which the server can't
  // know — rendering it there would hydrate with the server's hours. So it
  // mounts on the client and the server sends a same-sized empty frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // A dragged meeting is shown in its new place at once and kept there while
  // the save runs; if the save fails the transition ends and it snaps back.
  const [events, showMoved] = useOptimistic(
    meetings.map(
      ({ startsAt, endsAt, ...meeting }): AgendaEvent => ({
        ...meeting,
        start: new Date(startsAt),
        end: new Date(endsAt),
      }),
    ),
    (
      list,
      moved: { id: string; start: Date; end: Date; allDay: boolean },
    ) =>
      list.map((e) =>
        e.id === moved.id
          ? { ...e, start: moved.start, end: moved.end, allDay: moved.allDay }
          : e,
      ),
  );
  // Its own transition: `pending` belongs to the create form's button.
  const [, startMove] = useTransition();

  // Client-only for the same timezone reason as the calendar: "now" differs.
  const upcoming = mounted
    ? events
        .filter((e) => e.end > new Date() && e.status === 'SCHEDULED')
        .slice(0, 8)
    : [];

  function openDetails(event: AgendaEvent) {
    setSelected(event);
    details.current?.showModal();
  }

  function openForm(next: Draft, meeting: AgendaEvent | null = null) {
    setEditing(meeting);
    setDraft(next);
    setFormKey((k) => k + 1); // remount, so the fields take the new defaults
    setError(null);
    form.current?.showModal();
  }

  // Dragging across the month grid selects whole days; the grid's end is the
  // midnight after the last one, so the form shows the day before.
  function onSelectSlot({ start, end }: SlotInfo) {
    const wholeDays =
      moment(start).isSame(moment(start).startOf('day')) &&
      moment(end).isSame(moment(end).startOf('day'));
    openForm(
      wholeDays
        ? { start, end: moment(end).subtract(1, 'day').toDate(), allDay: true }
        : { start, end, allDay: false },
    );
  }

  // react-big-calendar calls this for a move and for a resize, when the mouse
  // is released — so letting go is the confirmation, there is no form.
  function reschedule({ event, start, end, isAllDay }: EventInteractionArgs<AgendaEvent>) {
    const range = {
      start: new Date(start),
      end: new Date(end),
      // The month grid has no all-day row, so a drop there keeps the flag.
      allDay: view === Views.MONTH ? event.allDay : (isAllDay ?? event.allDay),
    };
    startMove(async () => {
      showMoved({ id: event.id, ...range });
      const result = await rescheduleMeeting(organizationId, event.id, {
        startsAt: range.start.toISOString(),
        endsAt: range.end.toISOString(),
        allDay: range.allDay,
      });
      if ('error' in result) toastError('Meeting not moved', result.error);
    });
  }

  // The form picks all-day ranges as inclusive dates, but one is stored to the
  // midnight after its last day, so the end steps back a day on the way in.
  function editMeeting(meeting: AgendaEvent) {
    details.current?.close();
    openForm(
      {
        start: meeting.start,
        end: meeting.allDay
          ? moment(meeting.end).subtract(1, 'day').toDate()
          : meeting.end,
        allDay: meeting.allDay,
      },
      meeting,
    );
  }

  // A drop from the popup carries only the target, so the meeting keeps its
  // length, and in the month grid its time of day: only the day changes.
  function dropFromPopup({ start, allDay }: DragFromOutsideItemArgs) {
    const event = dragged.current;
    dragged.current = null;
    if (!event) return;
    const length = event.end.getTime() - event.start.getTime();
    const newStart =
      view === Views.MONTH
        ? moment(event.start).add(
            moment(start).startOf('day').diff(moment(event.start).startOf('day'), 'days'),
            'days',
          )
        : moment(start);
    reschedule({
      event,
      start: newStart.toDate(),
      end: new Date(newStart.valueOf() + length),
      isAllDay: allDay,
    });
  }

  function toggleAllDay(allDay: boolean) {
    setDraft((d) => ({ ...d, allDay }));
    setFormKey((k) => k + 1);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const start = moment(String(data.get('start')));
    // An all-day range is picked as inclusive dates; stored, it runs to the
    // midnight after the last one, which is how the calendar draws all-day.
    const end = moment(String(data.get('end')));
    const allDay = draft.allDay;

    startTransition(async () => {
      const fields = {
        title: String(data.get('title') ?? ''),
        startsAt: start.toISOString(),
        endsAt: (allDay ? end.add(1, 'day') : end).toISOString(),
        allDay,
        attendeeName: String(data.get('attendeeName') ?? ''),
        location: String(data.get('location') ?? ''),
        description: String(data.get('description') ?? ''),
      };
      const result = editing
        ? await updateMeeting(organizationId, editing.id, {
            ...fields,
            status: String(data.get('status')) as UpdateMeetingInput['status'],
          })
        : await createMeeting(organizationId, fields);
      if ('error' in result) {
        setError(result.error);
        toastError(editing ? 'Meeting not saved' : 'Meeting not created', result.error);
      } else {
        form.current?.close();
        toastSuccess(
          editing ? 'Meeting saved' : 'Meeting created',
          editing ? 'Your changes are on the agenda.' : 'It is on the agenda now.',
        );
      }
    });
  }

  const stamp = draft.allDay ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm';
  const fieldType = draft.allDay ? 'date' : 'datetime-local';

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        {heading ?? <span />}
        <button
          type="button"
          onClick={() => openForm(defaultDraft())}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
        >
          <PlusIcon className="h-4 w-4" />
          Create event
        </button>
      </div>

    <div className="rounded-lg border border-white/[0.07] bg-white/[0.05] p-3 backdrop-blur-xl">

      {mounted ? (
        <DnDCalendar
          localizer={localizer}
          events={events}
          titleAccessor="title"
          allDayAccessor="allDay"
          style={{ height: 640 }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          popup
          selectable
          onSelectEvent={openDetails}
          onSelectSlot={onSelectSlot}
          onEventDrop={reschedule}
          onEventResize={reschedule}
          handleDragStart={(event: AgendaEvent) => {
            dragged.current = event;
          }}
          dragFromOutsideItem={() => dragged.current as AgendaEvent}
          onDropFromOutside={dropFromPopup}
          resizable
          // A finished or cancelled meeting stays where it was.
          draggableAccessor={(event) => event.status === 'SCHEDULED'}
          resizableAccessor={(event) => event.status === 'SCHEDULED'}
          tooltipAccessor={(event) =>
            `${event.title}
${event.agent ? `Booked by ${event.agent.name}` : 'Added manually'}`
          }
          eventPropGetter={(event) => ({
            className: `meeting-${event.status.toLowerCase()}`,
          })}
        />
      ) : (
        <div style={{ height: 640 }} />
      )}

      <section className="mt-4 border-t border-white/[0.07] pt-4">
        <h2 className="mb-2 text-sm font-semibold">Upcoming events</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing coming up.</p>
        ) : (
          <ul className="divide-y divide-white/[0.07]">
            {upcoming.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => openDetails(event)}
                  className="flex w-full items-center justify-between gap-4 py-2 text-left text-sm hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{event.title}</span>
                    <span className="block text-xs text-gray-500">
                      {event.allDay
                        ? `${event.start.toLocaleDateString(undefined, { dateStyle: 'medium' })} · all day`
                        : event.start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}
                      {event.agent?.name ?? 'Added manually'}
                    </span>
                  </span>
                  <MeetingStatusBadge status={event.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <dialog
        ref={details}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        onClose={() => setSelected(null)}
        className={dialogClass}
      >
        {selected && (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">{selected.title}</h3>
              <MeetingStatusBadge status={selected.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {selected.allDay
                ? `${selected.start.toLocaleDateString(undefined, { dateStyle: 'full' })} · all day`
                : `${selected.start.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })} – ${selected.end.toLocaleTimeString(undefined, { timeStyle: 'short' })}`}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              {selected.attendeeName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">With</dt>
                  <dd>{selected.attendeeName}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Agent</dt>
                <dd>{selected.agent?.name ?? 'Added manually'}</dd>
              </div>
              {selected.location && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Where</dt>
                  <dd>{selected.location}</dd>
                </div>
              )}
            </dl>
            {selected.description && (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                {selected.description}
              </p>
            )}
            <form method="dialog" className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => editMeeting(selected)}
                className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
              >
                Edit
              </button>
              <button className="rounded-md border border-brand-red-lit/50 px-3 py-1 text-xs font-medium text-gray-900 transition-colors hover:border-brand-red-lit hover:bg-brand-red-lit/10 hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit">
                Close
              </button>
            </form>
          </div>
        )}
      </dialog>

      <dialog
        ref={form}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className={dialogClass}
      >
        <form key={formKey} onSubmit={submit} className="space-y-4 p-5">
          <h3 className="text-base font-semibold">
            {editing ? 'Edit event' : 'Create event'}
          </h3>

          <div>
            <label className={label} htmlFor="meeting-title">
              Title
            </label>
            <input
              id="meeting-title"
              name="title"
              required
              maxLength={120}
              autoFocus
              defaultValue={editing?.title}
              placeholder="Consultation"
              className={input}
            />
          </div>

          {editing && (
            <div>
              <label className={label} htmlFor="meeting-status">
                Status
              </label>
              <select
                id="meeting-status"
                name="status"
                defaultValue={editing.status}
                className={`${input} [&>option]:bg-gray-100`}
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-medium text-gray-900">
            <input
              type="checkbox"
              checked={draft.allDay}
              onChange={(e) => toggleAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-gray-200 bg-transparent"
            />
            All day
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="meeting-start">
                {draft.allDay ? 'From' : 'Starts'}
              </label>
              <input
                id="meeting-start"
                name="start"
                type={fieldType}
                required
                defaultValue={moment(draft.start).format(stamp)}
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="meeting-end">
                {draft.allDay ? 'To' : 'Ends'}
              </label>
              <input
                id="meeting-end"
                name="end"
                type={fieldType}
                required
                defaultValue={moment(draft.end).format(stamp)}
                className={input}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="meeting-with">
                With
              </label>
              <input
                id="meeting-with"
                name="attendeeName"
                maxLength={120}
                defaultValue={editing?.attendeeName ?? ''}
                placeholder="Optional"
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="meeting-where">
                Where
              </label>
              <input
                id="meeting-where"
                name="location"
                maxLength={120}
                defaultValue={editing?.location ?? ''}
                placeholder="Optional"
                className={input}
              />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="meeting-notes">
              Notes
            </label>
            <textarea
              id="meeting-notes"
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={editing?.description ?? ''}
              placeholder="Optional"
              className={input}
            />
          </div>

          <p aria-live="polite" className="min-h-4 text-xs text-red-400">
            {error}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => form.current?.close()}
              className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:text-brand-red-lit focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-brand-red-lit/50 bg-maroon-500/30 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-brand-red-lit hover:bg-maroon-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red-lit disabled:opacity-60"
            >
              {editing
                ? pending
                  ? 'Saving…'
                  : 'Save'
                : pending
                  ? 'Creating…'
                  : 'Create'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
    </>
  );
}
