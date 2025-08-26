import { ItemCard } from "../itemCards/calendar/itemCard";
import { Doc, Id } from "../../../convex/_generated/dataModel";

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
  return (
    <div className="space-y-8 ">
      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Active Tasks ({activeTasks.length})
          </h3>
          <div className="space-y-3">
            {activeTasks.map(
              ({
                _id,
                text,
                completed,
                mainOrder,
                type,
                parentId,
                expanded,
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
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-300">
            Completed Tasks ({completedTasks.length})
          </h3>
          <div className="space-y-3">
            {completedTasks.map(
              ({ _id, text, completed, mainOrder, type, expanded }) => (
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
                />
              )
            )}
          </div>
        </div>
      )}

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
