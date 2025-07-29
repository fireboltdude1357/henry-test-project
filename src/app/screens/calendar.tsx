import { TaskCard } from "@/components/itemCards/home/taskCard";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { CalendarItemDisplay } from "@/components/displayItems/calendarDisplay";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [numDays, setNumDays] = useState<number>(3);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const toDoItems = useQuery(api.toDoItems.get);
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const updateDayOrder = useMutation(api.toDoItems.updateDayOrder);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  const assignItemToDateAtPosition = useMutation(
    api.toDoItems.assignItemToDateAtPosition
  );
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

      console.log(
        "Drag end - draggedItemId in calendar.tsx on line 120:",
        draggedItemId
      );
      console.log(
        "Drag end - draggedOverItemId in calendar.tsx on line 121:",
        draggedOverItemId
      );
      console.log(
        "Drag end - isDateContainer in calendar.tsx on line 122:",
        isDateContainer
      );
      console.log(
        "Drag end - draggedItem in calendar.tsx on line 123:",
        draggedItem
      );

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

        // Extract item ID if it's a date item (date + Convex ID format)
        let itemIdToFind = draggedOverItemId;
        const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(
          draggedOverItemId
        );
        if (isDateItem) {
          itemIdToFind = draggedOverItemId.substring(10); // Remove date part (YYYY-MM-DD)
          console.log("Date item detected, extracting ID:", itemIdToFind);
        }

        const draggedOverItem = toDoItems?.find(
          (item) => item._id === itemIdToFind
        );
        console.log("Dragged item:", draggedItem);
        console.log("Dragged over item:", draggedOverItem);
        console.log("Dragged over item id (original):", draggedOverItemId);
        console.log("Dragged over item id (extracted):", itemIdToFind);

        // Check if we're dropping in a calendar day context
        const isDropInCalendarDay =
          draggedOverItemId &&
          (/^\d{4}-\d{2}-\d{2}$/.test(draggedOverItemId) || // Date container
            /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(draggedOverItemId) || // Date item
            /^\d{4}-\d{2}-\d{2}-bottom$/.test(draggedOverItemId)); // Bottom zone

        console.log("Drop context - isDropInCalendarDay:", isDropInCalendarDay);
        console.log("Drop context - draggedOverItemId:", draggedOverItemId);

        if (draggedItem && draggedOverItem) {
          if (isDropInCalendarDay) {
            // CALENDAR DAY CONTEXT: Use dayOrder logic
            console.log("Using calendar day reordering logic");

            // Check if both items are assigned to the same date for dayOrder reordering
            if (
              draggedItem.assignedDate &&
              draggedOverItem.assignedDate &&
              draggedItem.assignedDate === draggedOverItem.assignedDate
            ) {
              console.log("Reordering items within same day");

              let movingItemNewOrder = draggedOverItem?.dayOrder || 0;
              const movingItemOldOrder =
                draggedItem?.dayOrder || movingItemNewOrder;

              const difference = movingItemNewOrder - movingItemOldOrder;
              console.log("Day order difference:", difference);

              let interval = 0;
              if (difference > 0) {
                interval = 1;
                movingItemNewOrder = movingItemNewOrder - 1;
              } else {
                interval = -1;
              }

              console.log("Moving item new dayOrder:", movingItemNewOrder);
              console.log("Moving item old dayOrder:", movingItemOldOrder);

              // Get all items for this date to reorder them
              const sameDate = draggedItem.assignedDate;
              const itemsOnSameDate =
                toDoItems?.filter(
                  (item) =>
                    item.assignedDate === sameDate &&
                    item.dayOrder !== undefined &&
                    item.dayOrder !== null
                ) || [];

              // Reorder items between old and new positions
              for (
                let i = movingItemOldOrder + interval;
                i !== movingItemNewOrder + interval;
                i += interval
              ) {
                console.log("Updating dayOrder for item with order:", i);
                const item = itemsOnSameDate.find(
                  (item) => item.dayOrder === i
                );
                if (item) {
                  updateDayOrder({
                    id: item._id as Id<"toDoItems">,
                    dayOrder: (item.dayOrder || 0) - interval,
                  });
                }
              }

              // Update the dragged item's dayOrder
              updateDayOrder({
                id: draggedItemId as Id<"toDoItems">,
                dayOrder: movingItemNewOrder,
              });
            } else {
              console.log(
                "Items not on same date, checking for positional assignment"
              );
              // If dragging to a specific item on a different date, position it relative to that item
              if (draggedOverItem.assignedDate && draggedOverItem.dayOrder) {
                // Insert AFTER the target item (target position + 1)
                const targetPosition = draggedOverItem.dayOrder + 1;
                console.log(
                  `Assigning item to position ${targetPosition} (after item at ${draggedOverItem.dayOrder}) on ${draggedOverItem.assignedDate}`
                );
                await assignItemToDateAtPosition({
                  id: draggedItem._id as Id<"toDoItems">,
                  date: draggedOverItem.assignedDate,
                  targetDayOrder: targetPosition, // Insert after the target item
                });
              } else if (draggedOverItem.assignedDate) {
                // Fallback to basic assignment if no specific position
                console.log("Using basic assignment as fallback");
                await assignItemToDate({
                  id: draggedItem._id as Id<"toDoItems">,
                  date: draggedOverItem.assignedDate,
                });
              }
            }
          } else {
            // SIDEBAR CONTEXT: Use mainOrder logic (like home page)
            console.log("Using sidebar mainOrder reordering logic");

            if (!draggedOverItem.parentId) {
              let movingItemNewOrder = draggedOverItem?.mainOrder || 0;
              const movingItemOldOrder =
                draggedItem?.mainOrder || movingItemNewOrder;

              const difference = movingItemNewOrder - movingItemOldOrder;
              console.log("Main order difference:", difference);

              let interval = 0;
              if (difference > 0) {
                interval = 1;
                movingItemNewOrder = movingItemNewOrder - 1;
              } else {
                interval = -1;
              }

              console.log("Moving item new mainOrder:", movingItemNewOrder);
              console.log("Moving item old mainOrder:", movingItemOldOrder);

              // Reorder items between old and new positions using mainOrder
              for (
                let i = movingItemOldOrder + interval;
                i !== movingItemNewOrder + interval;
                i += interval
              ) {
                console.log("Updating mainOrder for item with order:", i);
                const item = toDoItems?.find((item) => item.mainOrder === i);
                if (item) {
                  updateOrder({
                    id: item._id as Id<"toDoItems">,
                    order: (item.mainOrder || 0) - interval,
                  });
                }
              }

              // Update the dragged item's mainOrder
              updateOrder({
                id: draggedItemId as Id<"toDoItems">,
                order: movingItemNewOrder,
              });
            }
          }
        }
      } else if (draggedOverItemId?.includes("-bottom") && draggedItem) {
        // Handle dropping at bottom of a specific day
        const dateStr = draggedOverItemId.replace("-bottom", "");
        console.log("Dropping at bottom of day:", dateStr);

        // Assign item to this date
        try {
          await assignItemToDate({
            id: draggedItem._id as Id<"toDoItems">,
            date: dateStr,
          });
          console.log("Successfully assigned item to bottom of date");
        } catch (error) {
          console.error("Failed to assign item to bottom of date:", error);
        }
      } else if (draggedOverItemId === "bottom" && draggedItem) {
        // Handle dropping at bottom (main list)
        console.log("Dropping at bottom");
        updateOrder({
          id: draggedItemId as Id<"toDoItems">,
          order: maxMainOrder,
        });
      }
    }
    console.log("draggedItemId", draggedItemId);
    console.log("draggedOverItemId", draggedOverItemId);
    setDraggedItemId(null);
    setDraggedOverItemId(null);
    console.log("Finished dragging item in calendar.tsx on line 196:", id);
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(id);

    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      //   console.log("HANDLING DRAG OVER IN CALENDAR.TSX");
      // Only log if it's a different item than the one being dragged
      // console.log("Dragging over item:", id);
      //   console.log("draggedItemId", draggedItemId);
      //   console.log("id", id);
      //   console.log("draggedOverItemId", draggedOverItemId);
      // Check if it's a day container (date string format YYYY-MM-DD)
      // Check if it's a date item (date string followed by Convex ID)
      const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(id);
      //   console.log("isDateContainer", isDateContainer);
      //   console.log("isDateItem", isDateItem);
      if (isDateItem) {
        const dateStr = id.substring(0, 10);
        const itemId = id.substring(10);
        console.log("dateStr", dateStr);
        console.log("itemId", itemId);
      }
      if (isDateItem) {
        // Extract the date part from the date item ID (first 10 characters: YYYY-MM-DD)
        setDraggedOverItemId(id);
        // setDraggedOverItemId(dateStr);
        console.log("Dragging over date item", id);
      } else if (isDateContainer) {
        // Allow dragging over day containers (works for all items, including nested ones)
        const draggedOverIdDateItemBool = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(
          draggedOverItemId || ""
        );
        if (draggedOverIdDateItemBool) {
          return;
        }
        console.log("Dragging over day:", id, "isDateContainer");
      } else if (id === "bottom") {
        console.log("BOTTOM DETECTED in calendar.tsx on line 385 =========");
        setDraggedOverItemId(id);
        return;
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
            <h2 className="text-lg font-semibold text-white mb-4">Task List</h2>
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
                // console.log(
                //   `Day ${dateStr} items:`,
                //   dayItems.map((item) => ({
                //     text: item.text,
                //     dayOrder: item.dayOrder,
                //     assignedDate: item.assignedDate,
                //   }))
                // );
                const isToday =
                  date.toDateString() === new Date().toDateString();
                const completedCount = dayItems.filter(
                  (item) => item.completed
                ).length;
                const totalCount = dayItems.length;

                return (
                  <div
                    key={dateStr}
                    id={dateStr}
                    onDragOver={(e) => {
                      e.preventDefault();
                      //   e.stopPropagation();
                      handleDragOver(dateStr, e);
                    }}
                    onDragEnter={(e) => {
                      e.stopPropagation();
                      handleDragEnter(dateStr);
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                      handleDragLeave(dateStr);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        "Day container drop event triggered for:",
                        dateStr
                      );
                      console.log("Current draggedItemId:", draggedItemId);
                      console.log(
                        "Current draggedOverItemId:",
                        draggedOverItemId
                      );

                      if (draggedItemId) {
                        // Check if we were dragging over a specific item in this day
                        const wasOverDateItem = draggedOverItemId?.startsWith(
                          dateStr + "j"
                        );
                        const wasOverBottomZone =
                          draggedOverItemId === `${dateStr}-bottom`;

                        console.log("wasOverDateItem:", wasOverDateItem);
                        console.log("wasOverBottomZone:", wasOverBottomZone);

                        if (wasOverDateItem || wasOverBottomZone) {
                          // Let handleDragEnd handle the positioning logic
                          console.log(
                            "Delegating to handleDragEnd for precise positioning"
                          );
                          handleDragEnd(draggedItemId);
                        } else {
                          // Only use basic assignment if we weren't over any specific drop zone
                          const draggedItem = toDoItems?.find(
                            (item) => item._id === draggedItemId
                          );
                          console.log("Found dragged item:", draggedItem);

                          if (draggedItem) {
                            console.log("Assigning item to date:", dateStr);
                            assignItemToDate({
                              id: draggedItem._id as Id<"toDoItems">,
                              date: dateStr,
                            })
                              .then((result) => {
                                console.log(
                                  "Successfully assigned item to date, result:",
                                  result
                                );
                                // Reset drag state
                                setDraggedItemId(null);
                                setDraggedOverItemId(null);
                              })
                              .catch((error) => {
                                console.error(
                                  "Failed to assign item to date:",
                                  error
                                );
                                // Reset drag state even on error
                                setDraggedItemId(null);
                                setDraggedOverItemId(null);
                              });
                          } else {
                            // Reset drag state if no item found
                            setDraggedItemId(null);
                            setDraggedOverItemId(null);
                          }
                        }
                      }
                    }}
                    className={`bg-slate-800/40 backdrop-blur-sm rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                      isToday
                        ? "border-blue-500 shadow-blue-500/20"
                        : draggedOverItemId === dateStr
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
                          {formatDateForDisplay(date)}
                        </div>
                        {isToday && (
                          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            Today
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-slate-400 text-sm">
                          {getDayOfWeek(date)} • {date.getDate()}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {totalCount > 0 && (
                            <>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-green-400 font-medium">
                                  {completedCount}
                                </span>
                              </div>
                              <div className="text-slate-500">/</div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                <span className="text-slate-400 font-medium">
                                  {totalCount}
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
                        {dayItems.length > 0 ? (
                          dayItems
                            .sort((a, b) => {
                              // console.log(
                              //   `Sorting: ${a.text} (dayOrder: ${a.dayOrder}) vs ${b.text} (dayOrder: ${b.dayOrder})`
                              // );
                              return (a.dayOrder || 0) - (b.dayOrder || 0);
                            })
                            .map((item) => (
                              <div
                                key={dateStr + item._id}
                                draggable={true}
                                className={`bg-slate-700/50 rounded-lg p-3 border transition-all duration-200 relative cursor-move ${
                                  item.completed
                                    ? "border-green-500/30 bg-green-500/5"
                                    : "border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/70"
                                }`}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    "text/plain",
                                    item._id
                                  );
                                  console.log(
                                    "onDragStart in calendar day:",
                                    item._id
                                  );
                                  handleDragStart(item._id);
                                }}
                                onDragEnd={() => {
                                  handleDragEnd(item._id);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  handleDragOver(dateStr + item._id, e);
                                }}
                                onDragEnter={(e) => {
                                  e.stopPropagation();
                                  handleDragEnter(dateStr + item._id);
                                }}
                                onDragLeave={(e) => {
                                  e.stopPropagation();
                                  handleDragLeave(dateStr + item._id);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log(
                                    "Item drop triggered for:",
                                    dateStr + item._id
                                  );
                                  if (draggedItemId) {
                                    handleDragEnd(draggedItemId);
                                  }
                                }}
                              >
                                {/* Visual feedback for drag and drop */}
                                {draggedOverItemId === dateStr + item._id &&
                                  draggedItemId &&
                                  draggedItemId !== item._id && (
                                    <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-10"></div>
                                  )}
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() =>
                                      toggleComplete({
                                        id: item._id as Id<"toDoItems">,
                                      })
                                    }
                                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={`text-sm font-medium ${
                                        item.completed
                                          ? "line-through text-slate-400"
                                          : "text-white"
                                      }`}
                                    >
                                      {item.text}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      ({item.dayOrder})
                                    </div>
                                    {item.type && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            item.type === "project"
                                              ? "bg-purple-500"
                                              : item.type === "task"
                                                ? "bg-blue-500"
                                                : "bg-yellow-500"
                                          }`}
                                        ></div>
                                        <span className="text-xs text-slate-400 capitalize">
                                          {item.type}
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
                            <div className="text-slate-500 text-sm">
                              No tasks scheduled
                            </div>
                          </div>
                        )}

                        {/* Bottom drop zone for each day */}
                        {dayItems.length > 0 && (
                          <div
                            id={`${dateStr}-bottom`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              handleDragOver(`${dateStr}-bottom`, e);
                            }}
                            onDragEnter={(e) => {
                              e.stopPropagation();
                              handleDragEnter(`${dateStr}-bottom`);
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              handleDragLeave(`${dateStr}-bottom`);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                "Bottom zone drop triggered for:",
                                `${dateStr}-bottom`
                              );
                              if (draggedItemId) {
                                handleDragEnd(draggedItemId);
                              }
                            }}
                            className="h-4 w-full relative mt-2"
                          >
                            {draggedOverItemId === `${dateStr}-bottom` &&
                              draggedItemId && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></div>
                              )}
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
                        Add task for {formatDateForDisplay(date)}
                      </button>
                    </div>
                  </div>
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
    </div>
  );
}
