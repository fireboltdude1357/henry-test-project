import { TaskCard } from "@/components/itemCards/home/taskCard";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { CalendarItemDisplay } from "@/components/displayItems/calendarDisplay";
import { Authenticated } from "convex/react";
import CalendarDay from "@/components/calendarDay";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [numDays, setNumDays] = useState<number>(3);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const toDoItems = useQuery(api.toDoItems.get);
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(
    null
  );

  // Generate array of dates for the view
  const dateRange = useMemo(() => {
    const dates = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [startDate, numDays]);

  // Format date to YYYY-MM-DD string for API
  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Query items for the date range
  const items = useQuery(api.toDoItems.getItemsByDateRange, {
    startDate: formatDateForAPI(dateRange[0]),
    endDate: formatDateForAPI(dateRange[dateRange.length - 1]),
  });

  // Group items by date
  const itemsByDate = useMemo(() => {
    if (!items) return {};

    const grouped: { [key: string]: typeof items } = {};
    items.forEach((item) => {
      if (item.assignedDate) {
        if (!grouped[item.assignedDate]) {
          grouped[item.assignedDate] = [];
        }
        grouped[item.assignedDate].push(item);
      }
    });
    return grouped;
  }, [items]);

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

  const goToToday = () => {
    setStartDate(new Date());
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

  const getDayOfWeek = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragEnd = async (id: string) => {
    console.log("================================================");
    console.log("draggedItemId", draggedItemId);
    console.log("draggedOverItemId", draggedOverItemId);
    if (draggedOverItemId && draggedItemId) {
      console.log("Finished dragging item in calendar.tsx on line 115:", id);
      const draggedItem = toDoItems?.find((item) => item._id === draggedItemId);
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(draggedOverItemId);

      console.log("Drag end - draggedItemId:", draggedItemId);
      console.log("Drag end - draggedOverItemId:", draggedOverItemId);
      console.log("Drag end - isDateContainer:", isDateContainer);
      console.log("Drag end - draggedItem:", draggedItem);

      if (isDateContainer && draggedItem) {
        // Handle dropping on a day container - assign item to that date
        console.log("Assigning item to date:", draggedOverItemId);
        try {
          await assignItemToDate({
            id: draggedItem._id as Id<"toDoItems">,
            date: draggedOverItemId,
          });
          console.log("Successfully assigned item to date");
        } catch (error) {
          console.error("Failed to assign item to date:", error);
        }
      } else if (draggedOverItemId !== "bottom") {
        // Handle dropping on other todo items (existing reordering logic)
        // Only do reordering if we're not dropping on a date container
        const draggedOverItem = toDoItems?.find(
          (item) => item._id === draggedOverItemId
        );
        console.log("Dragged item:", draggedItem);
        console.log("Dragged over item:", draggedOverItem);
        console.log("Dragged over item id:", draggedOverItemId);

        if (draggedItem && draggedOverItem && !draggedOverItem.parentId) {
          console.log("Reordering items");
          let movingItemNewOrder = draggedOverItem?.mainOrder || 0;

          const movingItemOldOrder =
            draggedItem?.mainOrder || movingItemNewOrder;

          const difference = movingItemNewOrder - movingItemOldOrder;
          console.log("Difference:", difference);

          let interval = 0;
          if (difference > 0) {
            interval = 1;
            movingItemNewOrder = movingItemNewOrder - 1;
          } else {
            interval = -1;
          }

          console.log("Moving item new order:", movingItemNewOrder);
          console.log("Moving item old order:", movingItemOldOrder);
          for (
            let i = movingItemOldOrder + interval;
            i !== movingItemNewOrder + interval;
            i += interval
          ) {
            console.log("Updating order for item:", i);
            const item = toDoItems?.find((item) => item.mainOrder === i);
            if (item) {
              updateOrder({
                id: item._id as Id<"toDoItems">,
                order: item.mainOrder - interval,
              });
            }
          }
          updateOrder({
            id: draggedItemId as Id<"toDoItems">,
            order: movingItemNewOrder,
          });
        }
      } else if (draggedOverItemId === "bottom" && draggedItem) {
        // Handle dropping at bottom
        console.log("Dropping at bottom");
        updateOrder({
          id: draggedItemId as Id<"toDoItems">,
          order: maxMainOrder,
        });
      }
    }
    setDraggedItemId(null);
    setDraggedOverItemId(null);
    console.log("Finished dragging item in calendar.tsx on line 196:", id);
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      console.log("HANDLING DRAG OVER IN CALENDAR.TSX");
      // Only log if it's a different item than the one being dragged
      // console.log("Dragging over item:", id);
      console.log("draggedItemId", draggedItemId);
      console.log("id", id);
      console.log("draggedOverItemId", draggedOverItemId);
      // Check if it's a day container (date string format YYYY-MM-DD)
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(id);
      // Check if it's a date item (date string followed by Convex ID)
      const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(id);
      console.log("isDateContainer", isDateContainer);
      console.log("isDateItem", isDateItem);

      if (isDateContainer) {
        // Allow dragging over day containers (works for all items, including nested ones)
        setDraggedOverItemId(id);
        console.log("Dragging over day:", id);
      } else if (isDateItem) {
        // Extract the date part from the date item ID (first 10 characters: YYYY-MM-DD)
        const dateStr = id.substring(0, 10);
        setDraggedOverItemId(dateStr);
        console.log("Dragging over date item, treating as day:", dateStr);
      } else if (id === "bottom") {
        setDraggedOverItemId(id);
        console.log("Dragging over bottom");
      } else {
        // Handle dragging over todo items - removed parentId restriction
        const draggedOverItem = toDoItems?.find((item) => item._id === id);
        if (draggedOverItem) {
          setDraggedOverItemId(id);
          console.log("Dragging over item:", id);
        }
      }
    }
  };

  const handleDragEnter = (id: string) => {
    // Only log if it's a different item than the one being dragged
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      console.log("Entered item:", id);
    }
  };

  const handleDragLeave = (id: string) => {
    console.log("Left item:", id);
    // Only log if it's a different item than the one being dragged
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      console.log("Left item:", id);
    }
  };
  const zeroLevelItems =
    toDoItems?.filter((item) => item.parentId === undefined) || [];
  const activeTasks = zeroLevelItems?.filter((item) => !item.completed) || [];
  const completedTasks = zeroLevelItems?.filter((item) => item.completed) || [];
  const maxMainOrder = (activeTasks.length || 0) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Authenticated>
        <div className="max-w-[1600px] mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Calendar</h1>
                <p className="text-slate-400">
                  Plan and organize your tasks by day
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
                  <span className="text-slate-300 text-sm font-medium">
                    View:
                  </span>
                  <select
                    value={numDays}
                    onChange={(e) => setNumDays(Number(e.target.value))}
                    className="bg-slate-700 text-white px-3 py-1.5 rounded-md border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                  </select>
                </div>

                <button
                  onClick={goToToday}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[300px_1fr] gap-8">
            {/* Sidebar - Task List */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4">
                Task List
              </h2>
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
              />
            </div>

            {/* Main Calendar Area */}
            <div className="space-y-6">
              {/* Navigation */}
              <div className="flex items-center justify-between bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
                <button
                  onClick={goToPreviousDays}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
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

                <button
                  onClick={goToNextDays}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
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
                {dateRange.map((date, index) => {
                  const dateStr = formatDateForAPI(date);
                  const dayItems = itemsByDate[dateStr] || [];
                  const isToday =
                    date.toDateString() === new Date().toDateString();
                  const completedCount = dayItems.filter(
                    (item) => item.completed
                  ).length;
                  const totalCount = dayItems.length;

                  return (
                    <CalendarDay
                      key={dateStr}
                      date={dateStr}
                      draggedOverItemId={draggedOverItemId}
                      setDraggedOverItemId={setDraggedOverItemId}
                      draggedItemId={draggedItemId}
                      setDraggedItemId={setDraggedItemId}
                    />
                  );
                })}
              </div>

              {/* Loading state */}
              {items === undefined && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-700 rounded-full mb-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-slate-400">Loading tasks...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}
