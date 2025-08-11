import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
// no local state needed currently
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

type ToDoItemType = "project" | "task" | "folder" | undefined;

function ProjectChildren({
  parentId,
  draggedItemId,
  setDraggedItemId,
  childDraggedOverItemId,
  setChildDraggedOverItemId,
  setChildDraggedItemId,
  showNestedHighlights,
  setDragFromNested,
}: {
  parentId: Id<"toDoItems">;
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  childDraggedOverItemId: string | null;
  setChildDraggedOverItemId: (id: string | null) => void;
  setChildDraggedItemId: (id: string | null) => void;
  showNestedHighlights: boolean;
  setDragFromNested: (v: boolean) => void;
}) {
  const children = useQuery(api.projects.getByParentId, { parentId });
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  const toggleChildComplete = useMutation(api.toDoItems.toggleComplete);
  if (!children) return null;
  const visibleChildren = children.filter(() => true);
  return (
    <div
      className="ml-6 mt-3 flex flex-col gap-2 border-l-2 border-purple-700/30 pl-4"
      onDragLeave={() => setChildDraggedOverItemId(null)}
    >
      {visibleChildren.map((child) => (
        <div
          key={child._id}
          className="relative text-sm text-slate-300 flex items-center gap-2 bg-slate-700/40 rounded-md px-2 py-1 border border-slate-600/50"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDragFromNested(true);
            setDraggedItemId(child._id);
            setChildDraggedItemId(child._id);
          }}
          onDrop={(e) => {
            // Prevent day-level or project-level drop handlers from firing
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnd={async (e) => {
            e.stopPropagation();
            const isDateToken =
              !!childDraggedOverItemId &&
              /\d{4}-\d{2}-\d{2}/.test(childDraggedOverItemId);
            const dragged = children?.find((c) => c._id === draggedItemId);
            const overChild = children?.find(
              (c) => c._id === childDraggedOverItemId
            );
            if (dragged) {
              if (isDateToken) {
                await assignItemToDate({
                  id: dragged._id as Id<"toDoItems">,
                  date: childDraggedOverItemId!,
                });
              } else if (
                overChild ||
                (childDraggedOverItemId?.startsWith("child-bottom-") ?? false)
              ) {
                let movingItemNewOrder = overChild?.mainOrder || 0;
                const maxOrder = (children?.length || 0) + 1;
                const movingItemOldOrder =
                  dragged.mainOrder || movingItemNewOrder;
                if (childDraggedOverItemId?.startsWith("child-bottom-")) {
                  movingItemNewOrder = maxOrder;
                }
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
                  const itemAt = children?.find(
                    (i2) => (i2.mainOrder ?? -1) === i
                  );
                  if (itemAt) {
                    await updateOrder({
                      id: itemAt._id as Id<"toDoItems">,
                      order: (itemAt.mainOrder ?? 0) - interval,
                    });
                  }
                }
                await updateOrder({
                  id: dragged._id as Id<"toDoItems">,
                  order: movingItemNewOrder,
                });
              }
            }
            setDraggedItemId(null);
            setChildDraggedItemId(null);
            setChildDraggedOverItemId(null);
            setDragFromNested(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (
              showNestedHighlights &&
              draggedItemId &&
              draggedItemId !== child._id &&
              childDraggedOverItemId !== child._id
            ) {
              setChildDraggedOverItemId(child._id);
            }
          }}
          onDragLeave={() => {
            if (childDraggedOverItemId === child._id)
              setChildDraggedOverItemId(null);
          }}
        >
          {showNestedHighlights && childDraggedOverItemId === child._id && (
            <div className="absolute top-[-6px] left-0 right-0 h-[3px] bg-blue-500 rounded-full" />
          )}
          <div
            className={`w-2 h-2 rounded-full ${
              (child.type as ToDoItemType) === "project"
                ? "bg-purple-500"
                : (child.type as ToDoItemType) === "task"
                  ? "bg-blue-500"
                  : "bg-yellow-500"
            }`}
          />
          <input
            type="checkbox"
            checked={child.completed}
            onChange={() =>
              toggleChildComplete({ id: child._id as Id<"toDoItems"> })
            }
            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
          />
          <span className={child.completed ? "line-through opacity-70" : ""}>
            {child.text}
          </span>
        </div>
      ))}
      {/* Bottom zone for child list */}
      <div
        id={`child-bottom-${String(parentId)}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showNestedHighlights)
            setChildDraggedOverItemId(`child-bottom-${String(parentId)}`);
        }}
        onDrop={(e) => {
          // Prevent bubbling to day-level drop zones
          e.preventDefault();
          e.stopPropagation();
        }}
        className="h-6"
      >
        {showNestedHighlights &&
          childDraggedOverItemId === `child-bottom-${String(parentId)}` && (
            <div className="h-[5px] bg-blue-500 rounded-full" />
          )}
      </div>
    </div>
  );
}

function ProjectDayItem({
  item,
  date,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  toggleComplete,
  draggedItemId,
  setDraggedItemId,
  isDraggingChild,
  showNestedHighlights,
  dragFromNested,
  setDragFromNested,
}: {
  item: {
    _id: string;
    text: string;
    completed: boolean;
    type?: ToDoItemType;
  };
  date: string;
  onDragOver: (id: string) => void;
  onDrop: (token: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  toggleComplete: (id: Id<"toDoItems">) => void;
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  isDraggingChild: boolean;
  showNestedHighlights: boolean;
  dragFromNested: boolean;
  setDragFromNested: (v: boolean) => void;
}) {
  // Local state for child drag interactions within this project
  const [localChildDraggedOverId, setLocalChildDraggedOverId] = useState<
    string | null
  >(null);
  // Note: we do not track local child dragged id since it is not needed here
  const [expanded, setExpanded] = useState(false);
  // dragFromNested is managed by parent so we can correlate day vs nested sources
  void dragFromNested; // reference to avoid unused warning in this scope
  return (
    <div
      className={`relative bg-slate-700/50 rounded-lg p-3 border transition-all duration-200 ${
        item?.completed
          ? "border-green-500/30 bg-green-500/5"
          : "border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/70"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        // Always forward to day-level logic when hovering project container
        onDragOver(date + item?._id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Always allow placing before this project at day level
        onDrop(date + String(item?._id));
      }}
      onDragEnter={(e) => {
        if (isDraggingChild) e.stopPropagation();
      }}
      onDragLeave={(e) => {
        if (isDraggingChild) e.stopPropagation();
      }}
    >
      <div
        className="flex items-start gap-3"
        draggable
        onMouseDown={(e) => {
          (e.currentTarget as HTMLElement).draggable = true;
        }}
        onDragStart={() => {
          onDragStart(String(item?._id));
        }}
        onDragEnd={() => onDragEnd()}
        onDragOver={(e) => {
          e.preventDefault();
          if (isDraggingChild) {
            e.stopPropagation();
            setLocalChildDraggedOverId("child-bottom");
          } else {
            onDragOver(date + String(item?._id));
          }
        }}
        onDragEnter={(e) => {
          if (isDraggingChild) e.stopPropagation();
        }}
        onDragLeave={(e) => {
          if (isDraggingChild) e.stopPropagation();
        }}
      >
        {/* No special overlay; container itself forwards to day-level */}
        <input
          type="checkbox"
          checked={item?.completed}
          onChange={() => {
            if (item?._id) toggleComplete(item._id as Id<"toDoItems">);
          }}
          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-purple-400 text-sm mr-2 hover:text-purple-300 transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          <svg
            className={`w-4 h-4 mr-1 transition-transform duration-200 ${
              expanded ? "rotate-90" : "rotate-0"
            }`}
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
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium ${item?.completed ? "line-through text-slate-400" : "text-white"}`}
          >
            {item?.text}
          </div>
          {item?.type && (
            <div className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs text-slate-400 capitalize">Project</span>
            </div>
          )}
        </div>
      </div>
      {expanded && (
        <ProjectChildren
          parentId={item._id as Id<"toDoItems">}
          draggedItemId={draggedItemId}
          setDraggedItemId={setDraggedItemId}
          childDraggedOverItemId={localChildDraggedOverId}
          setChildDraggedOverItemId={setLocalChildDraggedOverId}
          setChildDraggedItemId={() => {}}
          showNestedHighlights={showNestedHighlights}
          setDragFromNested={setDragFromNested}
        />
      )}
    </div>
  );
}

export default function CalendarDay({
  date,
  draggedItemId,
  draggedOverItemId,
  setDraggedOverItemId,
  setDraggedItemId,
  setChildDraggedOverItemId,
  setChildDraggedItemId,
}: {
  date: string;
  draggedItemId: string | null;
  draggedOverItemId: string | null;
  setDraggedOverItemId: (id: string | null) => void;
  setDraggedItemId: (id: string | null) => void;
  setChildDraggedOverItemId: (id: string | null) => void;
  childDraggedOverItemId?: string | null; // not used here
  childDraggedItemId?: string | null; // not used here
  setChildDraggedItemId: (id: string | null) => void;
}) {
  // console.log("date:", date);
  // console.log("draggedOverItemId:", draggedOverItemId);
  // local view state not used here
  const calendarDayData = useQuery(api.calendarDays.get, {
    date: date,
  });

  const calendarDay = calendarDayData?.day;
  const dayItems = calendarDayData?.items;
  // console.log("calendarDay:", calendarDayData);
  const { isAuthenticated } = useConvexAuth();
  const toDoItems = useQuery(
    api.toDoItems.get,
    isAuthenticated ? {} : undefined
  );
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  // const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  // const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  // const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(
  //   null
  // );
  const isToday = new Date(date).toDateString() === new Date().toDateString();
  const totalCount = calendarDay?.items.length || 0;

  // Format date to YYYY-MM-DD string for API
  // const formatDateForAPI = (date: Date) => date.toISOString().split("T")[0];

  // Navigation functions
  // const goToPreviousDays = () => {};

  // const goToNextDays = () => {};

  // const goToToday = () => {};

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

  // const handleDragStart = (_id: string) => {};

  // central drag-end handled in parent
  const handleDragEnd = async () => {
    console.log("================================================");
    console.log("draggedOverItemId", draggedOverItemId);
    if (draggedOverItemId) {
      console.log("Finished dragging item in calendar.tsx on line 115");
      const draggedItem = toDoItems?.find((item) => item._id === draggedItemId);
      // Allow child items to be placed relative to projects at day-level; only
      // nested list should handle child reorder when directly over child rows.
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(draggedOverItemId);
      const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(draggedOverItemId);

      console.log("Drag end - draggedItemId:", draggedItemId);
      console.log("Drag end - draggedOverItemId:", draggedOverItemId);
      console.log("Drag end - isDateContainer:", isDateContainer);
      console.log("Drag end - draggedItem:", draggedItem);

      if ((isDateContainer || isDateItem) && draggedItem) {
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
    console.log("Finished dragging item in calendar.tsx on line 196");
  };

  // Explicit drop handler on day or day-item targets to ensure finalization
  const handleDropOnDay = async (targetToken: string) => {
    if (!draggedItemId) return;
    const draggedItem = toDoItems?.find((i) => i._id === draggedItemId);
    if (!draggedItem) return;

    try {
      await assignItemToDate({
        id: draggedItem._id as Id<"toDoItems">,
        date: targetToken,
      });
    } finally {
      setDraggedItemId(null);
      setDraggedOverItemId(null);
    }
  };

  const handleDragOver = (id: string) => {
    console.log("id:", id);
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
      // Explicit top/bottom tokens
      const isDateBottom = /^\d{4}-\d{2}-\d{2}-bottom$/.test(id);
      const isDateTop = /^\d{4}-\d{2}-\d{2}-top$/.test(id);
      console.log("isDateContainer", isDateContainer);
      console.log("isDateItem", isDateItem);
      console.log("isDateBottom", isDateBottom);
      console.log("isDateTop", isDateTop);
      console.log("draggedItemId", draggedItemId);

      const draggedItem = toDoItems?.find((item) => item._id === draggedItemId);
      console.log("draggedItem", draggedItem);
      // When hovering day-level targets, ignore nested child drag state.
      if (draggedItem && draggedItem.parentId) {
        setChildDraggedOverItemId(null);
        setChildDraggedItemId(null);
      }

      if (isDateBottom || isDateTop) {
        // Always coerce to the bare date so the day is the active drop target
        const dateStr = id.substring(0, 10);
        setDraggedOverItemId(dateStr);
        console.log("Dragging over day edge (forcing day target):", dateStr);
      } else if (isDateContainer) {
        // Only set to bare date if we're moving between different days.
        // If we're in the same day and previously had a precise target (date+id), keep it.
        const previous = draggedOverItemId;
        const prevIsDateItem = previous
          ? /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(previous)
          : false;
        const prevDate = previous ? previous.substring(0, 10) : undefined;
        if (!prevIsDateItem || prevDate !== id) {
          setDraggedOverItemId(id);
          console.log("Dragging over day (updated):", id);
        } else {
          console.log("Dragging over day (kept precise target):", previous);
        }
      } else if (isDateItem) {
        // Keep full token so server can insert before specific item
        setDraggedOverItemId(id);
        console.log("Dragging over date item (will insert before):", id);
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

  // Only show blue insertion bars when dragging a nested child item
  const isDraggingChild = Boolean(
    draggedItemId && toDoItems?.find((i) => i._id === draggedItemId)?.parentId
  );
  // Track whether the current drag started from inside a nested child list
  const [dragFromNested, setDragFromNested] = useState(false);
  // Only show nested highlights when the drag started from a child within this project.
  // We infer that when dragging a child and the current hovered project contains that child.
  const getShowNestedHighlights = (projectId: string): boolean => {
    if (!isDraggingChild || !draggedItemId || !dragFromNested) return false;
    const dragged = toDoItems?.find((i) => i._id === draggedItemId);
    return dragged?.parentId === (projectId as unknown as Id<"toDoItems">);
  };

  return (
    <div>
      <div
        key={date}
        id={date}
        onDragOver={(e) => {
          e.preventDefault();
          //   e.stopPropagation();
          handleDragOver(date);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const token =
            draggedOverItemId &&
            draggedOverItemId.startsWith(date) &&
            draggedOverItemId.length > 10
              ? draggedOverItemId
              : date;
          console.log("Dropping on day container:", {
            date,
            draggedOverItemId,
            token,
          });
          handleDropOnDay(token);
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
          draggedOverItemId === date ||
          draggedOverItemId === `${date}-bottom` ||
          draggedOverItemId === `${date}-top`
            ? "border-green-500 bg-green-500/10 shadow-green-500/20"
            : isToday
              ? "border-blue-500 shadow-blue-500/20"
              : "border-slate-700/50 hover:border-slate-600"
        }`}
      >
        {/* Day Header */}
        <div
          className="p-6 pb-4 border-b border-slate-700/50"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDragOver(`${date}-top`);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropOnDay(date);
          }}
        >
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
              dayItems.map((item) =>
                item?.type === "project" || item?.type === "folder" ? (
                  <ProjectDayItem
                    key={date + item?._id}
                    item={item}
                    date={date}
                    onDragOver={(token) => handleDragOver(token)}
                    onDrop={(token) => handleDropOnDay(token)}
                    onDragStart={(id) => setDraggedItemId(id)}
                    onDragEnd={() => handleDragEnd()}
                    toggleComplete={(id) => toggleComplete({ id })}
                    draggedItemId={draggedItemId}
                    setDraggedItemId={setDraggedItemId}
                    isDraggingChild={isDraggingChild}
                    showNestedHighlights={getShowNestedHighlights(
                      String(item?._id)
                    )}
                    dragFromNested={dragFromNested}
                    setDragFromNested={setDragFromNested}
                  />
                ) : (
                  <div
                    key={date + item?._id}
                    className={`relative bg-slate-700/50 rounded-lg p-3 border transition-all duration-200 ${
                      item?.completed
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/70"
                    }`}
                    draggable
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(date + item?._id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDropOnDay(date + String(item?._id));
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(item?._id));
                      setDraggedItemId(String(item?._id));
                      // Drag started from day view, not nested
                      setDragFromNested(false);
                    }}
                    onDragEnd={() => {
                      handleDragEnd();
                    }}
                    onDragEnter={(e) => {
                      e.stopPropagation();
                    }}
                    onDragLeave={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex items-start gap-3 select-none cursor-grab active:cursor-grabbing">
                      {draggedOverItemId === date + String(item?._id) && (
                        <div className="absolute top-[-6px] left-0 right-0 h-[3px] bg-blue-500 rounded-full"></div>
                      )}
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
                                (item?.type as ToDoItemType) === "project"
                                  ? "bg-purple-500"
                                  : (item?.type as ToDoItemType) === "task"
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
                )
              )
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-50">📅</div>
                <div className="text-slate-500 text-sm">No tasks scheduled</div>
              </div>
            )}
            {/* Bottom drop zone to append at end of day */}
            <div
              id={`${date}-bottom`}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(`${date}-bottom`);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDropOnDay(date);
              }}
              className="h-6 w-full relative"
            >
              {/* No line highlight here; the entire day container turns green when hovering bottom */}
            </div>
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
