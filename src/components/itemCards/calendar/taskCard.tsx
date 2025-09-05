import { Id } from "../../../../convex/_generated/dataModel";
import { playCompletionPop } from "../../../utils/sounds";
import { useEffect, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export const TaskCard = ({
  _id,
  text,
  completed,
  toggleComplete,
  deleteItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  draggedOverItemId,
  mainOrder,
  setAdditionParentId,
  draggedItemId,
  setDraggedItemId,
  showHighlight,
}: {
  _id: string;
  text: string;
  completed: boolean;
  toggleComplete: (id: string) => void;
  deleteItem: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  onDragOver?: (id: string, e: React.DragEvent) => void;
  onDragEnter?: (id: string) => void;
  onDragLeave?: (id: string) => void;
  draggedOverItemId?: string | null;
  mainOrder: number;
  setAdditionParentId?: (id: Id<"toDoItems"> | null) => void;
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  showHighlight?: boolean;
}) => {
  // console.log("draggedOverItemId", draggedOverItemId);
  const isDraggedOver =
    typeof showHighlight === "boolean"
      ? showHighlight
      : draggedOverItemId === _id;
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const measure = () => {
    const el = textRef.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth);
  };
  useEffect(() => {
    measure();
    const handle = () => measure();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [text]);
  return (
    <div
      key={_id}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", _id);
        console.log("onDragStart in taskCard.tsx", _id);
        onDragStart?.(_id);
      }}
      onDragEnd={() => {
        onDragEnd?.(_id);
      }}
      onDragOver={(e) => {
        e.preventDefault(); // Allow dropping
        onDragOver?.(_id, e);
      }}
      onDragEnter={() => {
        onDragEnter?.(_id);
      }}
      onDragLeave={() => {
        onDragLeave?.(_id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragEnd?.(_id);
      }}
      className={`backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 shadow-lg hover:shadow-xl group cursor-move relative ${
        completed
          ? "bg-slate-800/20 border-slate-700/20 opacity-75 hover:opacity-100"
          : "bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={completed}
          onChange={async () => {
            const wasCompleted = completed;
            await toggleComplete(_id);
            if (!wasCompleted) playCompletionPop();
          }}
          className={`h-5 w-5 rounded border-slate-600 bg-slate-700 focus:ring-offset-0 transition-colors duration-200 ${
            completed
              ? "text-green-600 focus:ring-green-500"
              : "text-blue-600 focus:ring-blue-500"
          }`}
        />
        <div className="relative group flex-1 min-w-0">
          <span
            ref={textRef}
            className={`block truncate transition-colors duration-200 ${
              completed
                ? "text-slate-400 line-through"
                : "text-white group-hover:text-blue-100"
            }`}
            onMouseEnter={measure}
          >
            {text}
          </span>
          {/* {isTruncated && (
            <div className="absolute left-[-30px] bottom-full mb-1 z-[999] max-w-[40ch] break-words whitespace-normal px-2 py-1 rounded bg-slate-900/95 text-slate-200 text-xs border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
              {`Content: ${text}`}
            </div>
          )} */}
        </div>

        {isTruncated && (
          <div className="absolute left-0 bottom-full mb-1 z-[999] w-fit max-w-full break-words whitespace-normal px-2 py-1 rounded bg-slate-900/95 text-slate-200 text-xs border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
            {`${text}`}
          </div>
        )}
        <span className="text-slate-400 text-xs">({mainOrder})</span>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={() => deleteItem(_id)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="left"
              align="center"
              sideOffset={12}
              collisionPadding={8}
              className="z-[9999] rounded-md bg-slate-900/95 text-white text-xs px-2 py-1 border border-slate-700 shadow-md"
            >
              Delete task
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      {isDraggedOver && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-full z-10"></div>
      )}
    </div>
  );
};
