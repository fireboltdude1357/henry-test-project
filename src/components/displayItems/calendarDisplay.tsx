import { ItemCard } from "../itemCards/calendar/itemCard";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";

export const CalendarItemDisplay = ({
  activeTasks,
  completedTasks,
  draggedOverItemId,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDragStart,
  handleDragEnd,
  toggleComplete,
  deleteItem,
  toDoItems,
  draggedItemId,
  setDraggedItemId,
  setChildDraggedOverItemId,
  childDraggedOverItemId,
  childDraggedItemId,
  setChildDraggedItemId,
}: {
  activeTasks: Doc<"toDoItems">[];
  completedTasks: Doc<"toDoItems">[];
  draggedOverItemId: string | null;
  handleDragOver: (id: string, e: React.DragEvent) => void;
  handleDragEnter: (id: string) => void;
  handleDragLeave: (id: string) => void;
  handleDragStart: (id: string) => void;
  handleDragEnd: (id: string) => void;
  toggleComplete: (id: Id<"toDoItems">) => void;
  deleteItem: (id: Id<"toDoItems">) => void;
  toDoItems: Doc<"toDoItems">[];
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  setChildDraggedOverItemId: (id: string | null) => void;
  childDraggedOverItemId: string | null;
  childDraggedItemId: string | null;
  setChildDraggedItemId: (id: string | null) => void;
}) => {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const activeCount = activeTasks.length;
  const completedCount = completedTasks.length;

  return (
    <div className="bg-[var(--surface-1)]/60 rounded-xl border border-[var(--border)] backdrop-blur-xl flex flex-col h-[calc(100vh-160px)] min-h-0">
      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex items-end gap-2 border-b border-[var(--border)]/70">
          <button
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 rounded-t-lg border text-sm font-medium transition-colors ${
              tab === "active"
                ? "bg-slate-800 text-white border-slate-600 border-b-transparent"
                : "bg-slate-700/40 text-slate-300 border-slate-600/60 hover:bg-slate-700/60"
            }`}
          >
            Active
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-600/60 text-slate-200 border border-slate-500/60">
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-3 py-1.5 rounded-t-lg border text-sm font-medium transition-colors ${
              tab === "completed"
                ? "bg-slate-800 text-white border-slate-600 border-b-transparent"
                : "bg-slate-700/40 text-slate-300 border-slate-600/60 hover:bg-slate-700/60"
            }`}
          >
            Completed
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-600/60 text-slate-200 border border-slate-500/60">
              {completedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
        {tab === "active" ? (
          <div className="space-y-3 pr-2">
            {activeTasks.map(
              ({
                _id,
                text,
                completed,
                mainOrder,
                type,
                parentId,
                expanded,
                color,
                timeEstimateHours,
                timeEstimateMinutes,
              }) => {
                // Only show highlight when dragging within the same layer:
                // - If the dragged item has a parent, only highlight items with that same parent
                // - If the dragged item has no parent, only highlight top-level items
                const dragged = draggedItemId
                  ? toDoItems.find((i) => i._id === draggedItemId)
                  : undefined;
                const sameLayer = dragged
                  ? dragged.parentId === parentId
                  : parentId === undefined;
                const showHighlight = sameLayer && draggedOverItemId === _id;
                // Also suppress setting draggedOver id to cross-layer targets by short-circuiting onDragOver
                const onDragOverGuarded = (id: string, e: React.DragEvent) => {
                  if (sameLayer) {
                    handleDragOver(id, e);
                  } else {
                    // Prevent cross-layer hover from becoming active target
                    e.preventDefault();
                  }
                };
                return (
                  <ItemCard
                    key={_id}
                    _id={_id}
                    text={text}
                    completed={completed}
                    toggleComplete={async () => {
                      await toggleComplete(_id as Id<"toDoItems">);
                    }}
                    deleteItem={() => deleteItem(_id as Id<"toDoItems">)}
                    onDragStart={() => handleDragStart(_id)}
                    onDragEnd={() => handleDragEnd(_id)}
                    onDragOver={(id, e) => onDragOverGuarded(id, e)}
                    onDragEnter={() => handleDragEnter(_id)}
                    onDragLeave={() => handleDragLeave(_id)}
                    draggedOverItemId={draggedOverItemId}
                    mainOrder={mainOrder ?? 0}
                    type={type || "task"}
                    draggedItemId={draggedItemId}
                    setDraggedItemId={setDraggedItemId}
                    setChildDraggedOverItemId={setChildDraggedOverItemId}
                    childDraggedOverItemId={childDraggedOverItemId}
                    childDraggedItemId={childDraggedItemId}
                    setChildDraggedItemId={setChildDraggedItemId}
                    // control highlight strictly by same-layer logic
                    showHighlight={showHighlight}
                    draggedItemIsChild={Boolean(dragged?.parentId)}
                    expanded={expanded}
                    color={color}
                    timeEstimateHours={timeEstimateHours}
                    timeEstimateMinutes={timeEstimateMinutes}
                  />
                );
              }
            )}
            {/* Invisible bottom drop zone (only for top-level drags) */}
            {(() => {
              const dragged = draggedItemId
                ? toDoItems.find((i) => i._id === draggedItemId)
                : undefined;
              const isTopLevelDrag = !dragged?.parentId;
              return (
                <div
                  id="bottom"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (isTopLevelDrag) handleDragOver("bottom", e);
                  }}
                  onDragEnter={() => {
                    if (isTopLevelDrag) handleDragEnter("bottom");
                  }}
                  onDragLeave={() => {
                    if (isTopLevelDrag) handleDragLeave("bottom");
                  }}
                  className="h-12 w-full relative"
                >
                  {isTopLevelDrag && draggedOverItemId === "bottom" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {completedTasks.map(
              ({ _id, text, completed, mainOrder, type, expanded, color, timeEstimateHours, timeEstimateMinutes }) => (
                <ItemCard
                  key={_id}
                  _id={_id}
                  text={text}
                  completed={completed}
                  toggleComplete={async () => {
                    await toggleComplete(_id as Id<"toDoItems">);
                  }}
                  deleteItem={() => deleteItem(_id as Id<"toDoItems">)}
                  onDragStart={() => handleDragStart(_id)}
                  onDragEnd={() => handleDragEnd(_id)}
                  onDragOver={(id, e) => handleDragOver(id, e)}
                  onDragEnter={() => handleDragEnter(_id)}
                  onDragLeave={() => handleDragLeave(_id)}
                  draggedOverItemId={draggedOverItemId}
                  mainOrder={mainOrder ?? 0}
                  type={type || "task"}
                  draggedItemId={draggedItemId}
                  setDraggedItemId={setDraggedItemId}
                  setChildDraggedOverItemId={setChildDraggedOverItemId}
                  childDraggedOverItemId={childDraggedOverItemId}
                  childDraggedItemId={childDraggedItemId}
                  setChildDraggedItemId={setChildDraggedItemId}
                  expanded={expanded}
                  color={color}
                  timeEstimateHours={timeEstimateHours}
                  timeEstimateMinutes={timeEstimateMinutes}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {(!toDoItems || toDoItems.length === 0) && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No tasks yet
          </h3>
          <p className="text-slate-400">
            Add your first task using the form in the header to get started!
          </p>
        </div>
      )}
    </div>
  );
};
