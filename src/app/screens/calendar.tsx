import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useMemo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { CalendarItemDisplay } from "@/components/displayItems/calendarDisplay";
import { Authenticated, useConvexAuth } from "convex/react";
import CalendarDay from "@/components/calendarDay";

export default function CalendarScreen({
  numDays,
  setNumDays,
  startDate,
  setStartDate,
}: {
  numDays: number;
  setNumDays: (n: number) => void;
  startDate: Date;
  setStartDate: (d: Date) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const toDoItems = useQuery(
    api.toDoItems.get,
    isAuthenticated ? {} : undefined
  );
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(
    null
  );
  const [childDraggedOverItemId, setChildDraggedOverItemId] = useState<
    string | null
  >(null);
  const [childDraggedItemId, setChildDraggedItemId] = useState<string | null>(
    null
  );

  // Generate array of dates for the view
  const dateRange = useMemo(() => {
    const dates = [] as Date[];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [startDate, numDays]);

  // Format date to YYYY-MM-DD string for API
  const formatDateForAPI = (date: Date) => date.toISOString().split("T")[0];

  // Navigation functions
  const goToPreviousDays = () => {
    const newStartDate = new Date(startDate);
    newStartDate.setDate(startDate.getDate() - numDays);
    setStartDate(newStartDate);
  };

  const goToNextDays = () => {
    const newStartDate = new Date(startDate);
    newStartDate.setDate(startDate.getDate() + numDays);
    setStartDate(newStartDate);
  };

  // Format date for display
  const formatDateForDisplay = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString();
    const isTomorrow =
      date.toDateString() ===
      new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    if (isTomorrow) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDragEnd = async (id: string) => {
    if (draggedOverItemId && draggedItemId) {
      const draggedItem = toDoItems?.find((item) => item._id === draggedItemId);
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(draggedOverItemId);
      const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(draggedOverItemId);

      if ((isDateContainer || isDateItem) && draggedItem) {
        try {
          await assignItemToDate({
            id: draggedItem._id as Id<"toDoItems">,
            date: draggedOverItemId,
          });
        } catch {}
      } else if (draggedOverItemId !== "bottom") {
        const draggedOverItem = toDoItems?.find(
          (item) => item._id === draggedOverItemId
        );
        if (draggedItem && draggedOverItem && !draggedOverItem.parentId) {
          let movingItemNewOrder = draggedOverItem?.mainOrder || 0;
          const movingItemOldOrder =
            draggedItem?.mainOrder || movingItemNewOrder;
          const difference = movingItemNewOrder - movingItemOldOrder;
          let interval = 0;
          if (difference > 0) {
            interval = 1;
            movingItemNewOrder = movingItemNewOrder - 1;
          } else {
            interval = -1;
          }
          for (
            let i = movingItemOldOrder + interval;
            i !== movingItemNewOrder + interval;
            i += interval
          ) {
            const item = toDoItems?.find((item) => item.mainOrder === i);
            if (item) {
              updateOrder({
                id: item._id as Id<"toDoItems">,
                order: (item.mainOrder || 0) - interval,
              });
            }
          }
          updateOrder({
            id: draggedItemId as Id<"toDoItems">,
            order: movingItemNewOrder,
          });
        }
      }
    }
    setDraggedItemId(null);
    setDraggedOverItemId(null);
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(id);
      const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(id);

      const draggedItem = toDoItems?.find((item) => item._id === draggedItemId);
      if (draggedItem && draggedItem.parentId) {
        setChildDraggedOverItemId(draggedItem.parentId);
        setChildDraggedItemId(draggedItemId);
      } else {
        setChildDraggedOverItemId(null);
        setChildDraggedItemId(null);
      }

      if (isDateContainer) {
        setDraggedOverItemId(id);
      } else if (isDateItem) {
        setDraggedOverItemId(id);
      } else if (id === "bottom") {
        setDraggedOverItemId(id);
      } else {
        const draggedOverItem = toDoItems?.find((item) => item._id === id);
        if (draggedOverItem) setDraggedOverItemId(id);
      }
    }
  };

  const handleDragEnter = (id: string) => {
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      // no-op; reserved for future visual cues
    }
  };

  const handleDragLeave = (id: string) => {
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      // no-op; reserved for future visual cues
    }
  };

  const zeroLevelItems =
    toDoItems?.filter((item) => item.parentId === undefined) || [];
  const activeTasks = zeroLevelItems?.filter((item) => !item.completed) || [];
  const completedTasks = zeroLevelItems?.filter((item) => item.completed) || [];

  return (
    <div className="min-h-screen">
      <Authenticated>
        <div className="w-full">
          <div className="grid grid-cols-[380px_1fr] gap-0 min-h-screen items-stretch">
            {/* Left Side - Flush Task List, full height */}
            <div className="bg-[var(--surface-1)]/60 backdrop-blur-xl border-r border-[var(--border)] rounded-none min-h-screen sticky top-0">
              <div className="h-full flex flex-col">
                <div className="px-4 py-5 flex-1 overflow-auto">
                  <CalendarItemDisplay
                    activeTasks={activeTasks}
                    completedTasks={completedTasks}
                    draggedOverItemId={draggedOverItemId}
                    handleDragOver={handleDragOver}
                    handleDragEnter={handleDragEnter}
                    handleDragLeave={handleDragLeave}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                    toggleComplete={(id) => toggleComplete({ id })}
                    deleteItem={(id) => deleteItem({ id })}
                    toDoItems={toDoItems || []}
                    draggedItemId={draggedItemId}
                    setDraggedItemId={setDraggedItemId}
                    childDraggedOverItemId={childDraggedOverItemId}
                    setChildDraggedOverItemId={setChildDraggedOverItemId}
                    childDraggedItemId={childDraggedItemId}
                    setChildDraggedItemId={setChildDraggedItemId}
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Main Calendar Area */}
            <div className="space-y-6 px-6 pt-10">
              {/* Local controls now live here */}

              {/* Navigation */}
              <div className="flex items-center justify-between bg-[var(--surface-1)]/60 rounded-xl p-4 border border-[var(--border)] backdrop-blur-xl">
                <button
                  onClick={goToPreviousDays}
                  className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-[var(--border)]"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Previous {numDays} day{numDays > 1 ? "s" : ""}
                </button>
                <div className="flex items-center gap-3 bg-[var(--surface-1)]/60 rounded-lg px-4 py-2 border border-[var(--border)]">
                  <span className="text-slate-300 text-sm font-medium">
                    View:
                  </span>
                  <select
                    value={numDays}
                    onChange={(e) => setNumDays(Number(e.target.value))}
                    className="bg-slate-900/40 text-white px-3 py-1.5 rounded-md border border-[var(--border)] text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                  </select>
                </div>

                <div className="text-center">
                  <div className="text-white text-xl font-semibold">
                    {formatDateForDisplay(dateRange[0])}
                    {numDays > 1 &&
                      ` - ${formatDateForDisplay(dateRange[dateRange.length - 1])}`}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    {dateRange[0].toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStartDate(new Date())}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
                  >
                    Today
                  </button>
                </div>
                <button
                  onClick={goToNextDays}
                  className="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-[var(--border)]"
                >
                  Next {numDays} day{numDays > 1 ? "s" : ""}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Day Grid */}
              <div
                className={`grid gap-6 ${
                  numDays === 1
                    ? "grid-cols-1"
                    : numDays <= 3
                      ? "grid-cols-1 xl:grid-cols-3"
                      : numDays <= 5
                        ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
                        : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
                }`}
              >
                {dateRange.map((date) => (
                  <CalendarDay
                    key={formatDateForAPI(date)}
                    date={formatDateForAPI(date)}
                    draggedOverItemId={draggedOverItemId}
                    setDraggedOverItemId={setDraggedOverItemId}
                    draggedItemId={draggedItemId}
                    setDraggedItemId={setDraggedItemId}
                    setChildDraggedOverItemId={setChildDraggedOverItemId}
                    childDraggedOverItemId={childDraggedOverItemId}
                    childDraggedItemId={childDraggedItemId}
                    setChildDraggedItemId={setChildDraggedItemId}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}
