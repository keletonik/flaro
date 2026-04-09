import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User, Briefcase } from "lucide-react";
import { useListJobs } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/PriorityBadge";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am - 6pm
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface LocalEvent {
  id: string;
  title: string;
  date: string;
  startHour: number;
  endHour: number;
  type: "event" | "job";
  color: string;
  location?: string;
  assignedTo?: string;
  jobId?: string;
}

function getWeekDates(anchor: Date) {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() + i);
    return dt;
  });
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

const COLOR_OPTIONS = [
  { label: "Purple", value: "bg-violet-500 text-white border-violet-600" },
  { label: "Blue", value: "bg-blue-500 text-white border-blue-600" },
  { label: "Green", value: "bg-emerald-500 text-white border-emerald-600" },
  { label: "Amber", value: "bg-amber-400 text-white border-amber-500" },
  { label: "Red", value: "bg-red-500 text-white border-red-600" },
  { label: "Slate", value: "bg-slate-500 text-white border-slate-600" },
];

function AddEventModal({ defaultDate, onClose, onSave }: {
  defaultDate: string;
  onClose: () => void;
  onSave: (event: Omit<LocalEvent, "id">) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(10);
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);

  const fieldClass = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all";
  const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    onSave({
      title: title.trim(),
      date,
      startHour,
      endHour: Math.max(endHour, startHour + 1),
      type: "event",
      color,
      location: location || undefined,
      assignedTo: assignedTo || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">New Event</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
          <div>
            <label className={labelClass}>Title *</label>
            <input className={fieldClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting / Inspection / Call..." autoFocus required data-testid="input-event-title" />
          </div>
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" className={fieldClass} value={date} onChange={e => setDate(e.target.value)} required data-testid="input-event-date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Time</label>
              <select className={fieldClass} value={startHour} onChange={e => setStartHour(Number(e.target.value))} data-testid="select-event-start">
                {HOURS.map(h => (
                  <option key={h} value={h}>{h}:00 {h < 12 ? "am" : "pm"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <select className={fieldClass} value={endHour} onChange={e => setEndHour(Number(e.target.value))} data-testid="select-event-end">
                {HOURS.slice(1).map(h => (
                  <option key={h} value={h}>{h}:00 {h < 12 ? "am" : "pm"}</option>
                ))}
                <option value={HOURS[HOURS.length - 1] + 1}>{HOURS[HOURS.length - 1] + 1}:00 pm</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input className={fieldClass} value={location} onChange={e => setLocation(e.target.value)} placeholder="Office / Zoom / Site name" data-testid="input-event-location" />
          </div>
          <div>
            <label className={labelClass}>Assigned to</label>
            <input className={fieldClass} value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Casper / Tech name" data-testid="input-event-assignedto" />
          </div>
          <div>
            <label className={labelClass}>Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    c.value.split(" ")[0],
                    color === c.value ? "ring-2 ring-primary ring-offset-2" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:text-foreground transition-colors">
              Cancel
            </button>
            <button type="submit" data-testid="button-save-event" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventDetailPopover({ event, onClose, onDelete }: {
  event: LocalEvent;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", event.color.split(" ")[0])} />
          <div className="flex-1 mx-3">
            <p className="font-bold text-foreground">{event.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(event.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={13} />
            <span>{event.startHour}:00 — {event.endHour}:00</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={13} />
              <span>{event.location}</span>
            </div>
          )}
          {event.assignedTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User size={13} />
              <span>{event.assignedTo}</span>
            </div>
          )}
          {event.type === "job" && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Briefcase size={13} />
              <span>Job due date</span>
            </div>
          )}
        </div>
        {event.type === "event" && (
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full py-2 text-xs font-medium text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete Event
          </button>
        )}
      </div>
    </div>
  );
}

export default function Schedule() {
  const [anchor, setAnchor] = useState(new Date());
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [selected, setSelected] = useState<LocalEvent | null>(null);
  const { toast } = useToast();

  const { data: jobs } = useListJobs({});

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const jobEvents: LocalEvent[] = useMemo(() => {
    return (jobs || [])
      .filter(j => j.dueDate && j.status !== "Done")
      .map(j => ({
        id: `job-${j.id}`,
        title: `${j.taskNumber ? j.taskNumber + " — " : ""}${j.site}`,
        date: j.dueDate!.slice(0, 10),
        startHour: 9,
        endHour: 10,
        type: "job" as const,
        color: j.priority === "Critical" ? "bg-red-500 text-white border-red-600"
          : j.priority === "High" ? "bg-orange-400 text-white border-orange-500"
          : "bg-blue-500 text-white border-blue-600",
        assignedTo: j.assignedTech || undefined,
        jobId: j.id,
      }));
  }, [jobs]);

  const allEvents = useMemo(() => [...jobEvents, ...localEvents], [jobEvents, localEvents]);

  const addEvent = (ev: Omit<LocalEvent, "id">) => {
    setLocalEvents(prev => [...prev, { ...ev, id: `ev-${Date.now()}` }]);
    toast({ title: "Event added" });
  };

  const deleteEvent = (id: string) => {
    setLocalEvents(prev => prev.filter(e => e.id !== id));
  };

  const goBack = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
  const goForward = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };
  const goToday = () => setAnchor(new Date());

  const todayStr = toDateStr(new Date());
  const isCurrentWeek = weekDates.some(d => toDateStr(d) === todayStr);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-foreground font-bold text-lg tracking-tight">Schedule</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={goBack}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToday}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors",
                  isCurrentWeek
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Today
              </button>
              <button
                onClick={goForward}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block">
              {weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — {weekEnd.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button
              data-testid="button-add-event"
              onClick={() => { setAddDate(todayStr); setShowAdd(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />Add
            </button>
          </div>
        </div>

        {/* Mobile week date strip */}
        <div className="flex gap-1 mt-2 sm:hidden overflow-x-auto scrollbar-hide">
          {weekDates.map(d => {
            const str = toDateStr(d);
            const isToday = str === todayStr;
            const hasEvents = allEvents.some(e => e.date === str);
            return (
              <button
                key={str}
                onClick={() => { setAddDate(str); setShowAdd(true); }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg min-w-[44px] transition-colors",
                  isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <span className="text-[9px] font-bold uppercase">{DAYS[weekDates.indexOf(d)]}</span>
                <span className="text-sm font-bold">{d.getDate()}</span>
                {hasEvents && <div className={cn("w-1 h-1 rounded-full mt-0.5", isToday ? "bg-white/60" : "bg-primary")} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2 border-b border-border bg-muted/30 text-[10px] text-muted-foreground font-medium flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-red-500" /> Critical job
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-orange-400" /> High job
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-blue-500" /> Job due
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-violet-500" /> Event
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-border bg-muted/20 sticky top-0 z-10">
            <div className="py-2 px-3 text-[10px] text-muted-foreground font-medium border-r border-border" />
            {weekDates.map((d, i) => {
              const str = toDateStr(d);
              const isToday = str === todayStr;
              return (
                <div
                  key={str}
                  className={cn(
                    "py-2 px-2 border-r border-border last:border-r-0 text-center",
                    isToday && "bg-primary/5"
                  )}
                >
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", isToday ? "text-primary" : "text-muted-foreground")}>
                    {DAYS[i]}
                  </p>
                  <p className={cn(
                    "text-sm font-bold mt-0.5 w-7 h-7 rounded-full mx-auto flex items-center justify-center transition-colors",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-border" style={{ minHeight: "64px" }}>
              <div className="py-1 px-3 text-[10px] text-muted-foreground font-medium border-r border-border flex items-start pt-1 sticky left-0 bg-background z-10">
                {hour}:00
              </div>
              {weekDates.map(d => {
                const str = toDateStr(d);
                const isToday = str === todayStr;
                const dayEvents = allEvents.filter(e => e.date === str && e.startHour === hour);
                return (
                  <div
                    key={str}
                    className={cn(
                      "border-r border-border last:border-r-0 p-1 space-y-0.5 cursor-pointer",
                      isToday ? "bg-primary/3" : "hover:bg-muted/40"
                    )}
                    onClick={() => { setAddDate(str); setShowAdd(true); }}
                  >
                    {dayEvents.map(ev => (
                      <button
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); setSelected(ev); }}
                        className={cn(
                          "cal-event w-full text-left",
                          ev.color
                        )}
                        style={{
                          height: `${(ev.endHour - ev.startHour) * 56}px`,
                          minHeight: "20px",
                        }}
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}

          {/* All-day / due date events not in working hours */}
          {(() => {
            const outOfHours = allEvents.filter(ev => {
              const inWeek = weekDates.some(d => toDateStr(d) === ev.date);
              return inWeek && !HOURS.includes(ev.startHour);
            });
            if (!outOfHours.length) return null;
            return (
              <div className="border-t border-border p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">All-day / Other</p>
                <div className="flex flex-wrap gap-1.5">
                  {outOfHours.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      className={cn("cal-event", ev.color)}
                    >
                      {ev.title} · {ev.date}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {showAdd && (
        <AddEventModal
          defaultDate={addDate || todayStr}
          onClose={() => setShowAdd(false)}
          onSave={addEvent}
        />
      )}
      {selected && (
        <EventDetailPopover
          event={selected}
          onClose={() => setSelected(null)}
          onDelete={() => deleteEvent(selected.id)}
        />
      )}
    </div>
  );
}
