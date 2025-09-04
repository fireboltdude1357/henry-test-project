import { ItemCard } from "../itemCards/home/itemCard";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { TaskCard } from "../itemCards/home/taskCard";

export const HomeDisplay = ({
  activeTasks,
  completedTasks,
  setAdditionParentId,
  draggedOverItemId,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDragStart,
  handleDragEnd,
  toggleComplete,
  deleteItem,
  toDoItems,
  // openTimeMenu,
}: {
  activeTasks: Doc<"toDoItems">[];
  completedTasks: Doc<"toDoItems">[];
  setAdditionParentId: (id: Id<"toDoItems"> | null) => void;
  draggedOverItemId: string | null;
  handleDragOver: (id: string, e: React.DragEvent) => void;
  handleDragEnter: (id: string) => void;
  handleDragLeave: (id: string) => void;
  handleDragStart: (id: string) => void;
  handleDragEnd: (id: string) => void;
  toggleComplete: (id: Id<"toDoItems">) => void;
  deleteItem: (id: Id<"toDoItems">) => void;
  toDoItems: Doc<"toDoItems">[];
  // openTimeMenu: (id: string) => void;
}) => {
  return (
    <div className="space-y-8">
      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="bg-[var(--surface-1)]/60 rounded-xl p-6 border border-[var(--border)] backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white mb-4">
            Active Tasks ({activeTasks.length})
          </h3>
          <div className="space-y-3">
            {activeTasks.map(
              ({ _id, text, completed, mainOrder, type, expanded, color }) => (
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
                  mainOrder={mainOrder || -1}
                  setAdditionParentId={setAdditionParentId}
                  type={type || "task"}
                  expanded={expanded}
                  color={color}
                />
              )
            )}
            {/* Invisible bottom drop zone */}
            <div
              id="bottom"
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver("bottom", e);
              }}
              onDragEnter={() => handleDragEnter("bottom")}
              onDragLeave={() => handleDragLeave("bottom")}
              className="h-8 w-full relative"
            >
              {draggedOverItemId === "bottom" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full"></div>
              )}
            </div>
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
              ({ _id, text, completed, mainOrder, type, expanded, color }) => (
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
                  mainOrder={mainOrder || -1}
                  type={type || "task"}
                  setAdditionParentId={setAdditionParentId}
                  expanded={expanded}
                  color={color}
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
      {/* Time Estimate menu*/}
      <div className="fixed inset-0 inset-z-50 flex item-center justify-center bg-black/20 backdrop-blur">
        <div className="bg-white rounded-xl p-8 shadow-xl">

        </div>
      </div>

    </div>
  );
};
