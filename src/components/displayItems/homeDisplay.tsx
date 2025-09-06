import { ItemCard } from "../itemCards/home/itemCard";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { TaskCard } from "../itemCards/home/taskCard";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState } from "react";
import { time } from "console";
import { api } from "../../../convex/_generated/api";
import { useMutation } from "convex/react";



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
  openTimeMenu,
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
  openTimeMenu: (id: string) => void;

}) => {
  const [timeMenuTaskId, setTimeMenuTaskId] = useState<string | null>(null);
  const openTimeMenuLocal = (id: string) => setTimeMenuTaskId(id);
  const closeTimeMenuLocal = () => setTimeMenuTaskId(null);
  const [timeEstimate, setTimeEstimate] = useState(0);
  // const timeEstimate = useMutation(api.toDoItems.assignItemToDate);
  const setTimeEstimateMutation = useMutation(api.toDoItems.setTimeEstimate);
  const saveTimeEstimate = async () => {
  if (timeMenuTaskId) {
    const hours = Math.floor(timeEstimate / 4);
    const minutes = (timeEstimate % 4) * 15;
    await setTimeEstimateMutation({
      id: timeMenuTaskId as Id<"toDoItems">,
      timeEstimateHours: hours,
      timeEstimateMinutes: minutes,
    });
    closeTimeMenuLocal();
  }
};
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
                  openTimeMenu={openTimeMenuLocal}
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
                  setTimeEstimate={function (id: string, timeEstimate: number | null): void {
                    throw new Error("Function not implemented.");
                  }} 
                  timeEstimateHours={timeEstimateHours}
                  timeEstimateMinutes={timeEstimateMinutes}
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
                  openTimeMenu={openTimeMenuLocal}
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
                  color={color} setTimeEstimate={function (id: string, timeEstimate: number | null): void {
                    throw new Error("Function not implemented.");
                  }} 
                  timeEstimateHours={timeEstimateHours}
                  timeEstimateMinutes={timeEstimateMinutes}
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
      {/* Time Estimate menu -- Opens when timeMenuTaskId is NOT null*/}
      {timeMenuTaskId && (
        <div className="fixed inset-0 inset-z-50 flex items-center justify-center bg-black/20 backdrop-blur">
          <div className="relative flex items-center justify-center w-[500px] h-[200px] max-w-full bg-slate-800/80 rounded-xl p-8 shadow-xl border border-slate-700/50">
            <h1 className="absolute top-6 left-6 text-2xl font-semibold text-white">
              Set Time Estimate
            </h1>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={closeTimeMenuLocal}
                  className="absolute top-4 right-4 opacity-100 group-hover:opacity-100 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip.Trigger>
            </Tooltip.Root>
            <div className="mt-12">
              <>
                <label
                  htmlFor="minmax-range"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  {`${Math.floor(timeEstimate / 4)} hours${(timeEstimate % 4) ? ` and ${(timeEstimate % 4) * 15} minutes` : ""}`}
                </label>
                <input
                  id="minmax-range"
                  type="range"
                  min={0}
                  max={24}
                  // defaultValue={0}
                  value={timeEstimate}
                  onChange={e => setTimeEstimate(Number(e.target.value))}
                  className="w-86 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </>
            </div>
            <div className="m-4 mt-20">
              <button
                onClick={saveTimeEstimate}
                // onClick={async () => {
                //   if (timeEstimate )
                //    saveTimeEstimate();
                // }}

                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};
