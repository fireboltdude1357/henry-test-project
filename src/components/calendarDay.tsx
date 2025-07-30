import { TaskCard } from "@/components/itemCards/home/taskCard";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { CalendarItemDisplay } from "@/components/displayItems/calendarDisplay";

export default function CalendarDay({
  date,
  draggedItemId,
  draggedOverItemId,
  setDraggedOverItemId,
  setDraggedItemId,
}: {
  date: string;
  draggedItemId: string | null;
  draggedOverItemId: string | null;
  setDraggedOverItemId: (id: string | null) => void;
  setDraggedItemId: (id: string | null) => void;
}) {
  console.log("date:", date);
  console.log("draggedOverItemId:", draggedOverItemId);
  const [numDays, setNumDays] = useState<number>(3);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const calendarDayData = useQuery(api.calendarDays.get, {
    date: date,
  });

  const calendarDay = calendarDayData?.day;
  const dayItems = calendarDayData?.items;
  console.log("calendarDay:", calendarDayData);
  const toDoItems = useQuery(api.toDoItems.get);
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  // const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  // const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(
  //   null
  // );
  const isToday = new Date(date).toDateString() === new Date().toDateString();
  const totalCount = calendarDay?.items.length || 0;

  // Format date to YYYY-MM-DD string for API
  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

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
    setDraggedOverItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragEnd = async (id: string) => {
    console.log("================================================");
    console.log("draggedOverItemId", draggedOverItemId);
    if (draggedOverItemId) {
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

        if (
          draggedItem &&
          draggedOverItem &&
          !draggedOverItem.parentId &&
          draggedOverItem.mainOrder !== undefined
        ) {
          console.log("Reordering items");
          let movingItemNewOrder = draggedOverItem.mainOrder;

          const movingItemOldOrder = draggedItem.mainOrder;

          if (movingItemOldOrder !== undefined) {
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
              if (item && item.mainOrder !== undefined) {
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
  const activeTasks =
    zeroLevelItems?.filter(
      (item) => !item.completed && item.mainOrder !== undefined
    ) || [];
  const completedTasks = zeroLevelItems?.filter((item) => item.completed) || [];
  const activeTasksWithOrder = activeTasks.filter(
    (item) => item.mainOrder !== undefined
  );
  const maxMainOrder =
    activeTasksWithOrder.length > 0
      ? Math.max(...activeTasksWithOrder.map((item) => item.mainOrder!)) + 1
      : 1;

  return (
    <div>
      <div
        key={date}
        id={date}
        onDragOver={(e) => {
          e.preventDefault();
          //   e.stopPropagation();
          handleDragOver(date, e);
        }}
        onDragEnter={(e) => {
          e.stopPropagation();
          handleDragEnter(date);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          handleDragLeave(date);
        }}
        className={`bg-slate-800/40 backdrop-blur-sm rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
          isToday
            ? "border-blue-500 shadow-blue-500/20"
            : draggedOverItemId === date
              ? "border-green-500 bg-green-500/10 shadow-green-500/20"
              : "border-slate-700/50 hover:border-slate-600"
        }`}
      >
        {/* Day Header */}
        <div className="p-6 pb-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <div
              className={`text-xl font-bold ${
                isToday ? "text-blue-400" : "text-white"
              }`}
            >
              {formatDateForDisplay(new Date(date))}
            </div>
            {isToday && (
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                Today
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400 text-sm">
              {getDayOfWeek(new Date(date))} • {new Date(date).getDate()}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {totalCount > 0 && (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-400 font-medium">
                      {completedTasks.length}
                    </span>
                  </div>
                  <div className="text-slate-500">/</div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <span className="text-slate-400 font-medium">
                      {activeTasks.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tasks for this day */}
        <div className="p-6 pt-4">
          <div className="space-y-3 mb-4">
            {dayItems && dayItems.length > 0 ? (
              dayItems.map((item) => (
                <div
                  key={date + item?._id}
                  className={`bg-slate-700/50 rounded-lg p-3 border transition-all duration-200 ${
                    item?.completed
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/70"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver(date + item?._id, e);
                  }}
                  onDragEnter={(e) => {
                    e.stopPropagation();
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item?.completed}
                      onChange={() => {
                        if (item?._id) {
                          toggleComplete({ id: item._id as Id<"toDoItems"> });
                        }
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          item?.completed
                            ? "line-through text-slate-400"
                            : "text-white"
                        }`}
                      >
                        {item?.text}
                      </div>
                      {item?.type && (
                        <div className="flex items-center gap-1 mt-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item?.type === "project"
                                ? "bg-purple-500"
                                : item?.type === "task"
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            }`}
                          ></div>
                          <span className="text-xs text-slate-400 capitalize">
                            {item?.type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-50">📅</div>
                <div className="text-slate-500 text-sm">No tasks scheduled</div>
              </div>
            )}
          </div>

          {/* Add task button */}
          <button className="w-full text-slate-400 hover:text-white text-sm py-3 border-2 border-dashed border-slate-600 rounded-lg hover:border-slate-500 hover:bg-slate-700/30 transition-all duration-200 flex items-center justify-center gap-2">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add task for {formatDateForDisplay(new Date(date))}
          </button>
        </div>
      </div>
    </div>
  );
}
