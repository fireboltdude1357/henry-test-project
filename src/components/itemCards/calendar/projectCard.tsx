import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { playCompletionPop } from "../../../utils/sounds";
import { useEffect, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ItemCard } from "./itemCard";

export const ProjectCard = ({
  _id,
  text,
  completed,
  toggleComplete,
  // deleteItem is intentionally unused in this view
  deleteItem: _unusedDelete, // eslint-disable-line @typescript-eslint/no-unused-vars
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  draggedOverItemId,
  // mainOrder,
  setAdditionParentId,
  draggedItemId,
  setDraggedItemId,
  setChildDraggedOverItemId,
  childDraggedOverItemId,
  expanded,
  color,
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
  setChildDraggedOverItemId: (id: string | null) => void;
  childDraggedOverItemId: string | null;
  childDraggedItemId: string | null;
  expanded?: boolean;
  color?: string;
}) => {
  const children = useQuery(api.projects.getByParentId, {
    parentId: _id as Id<"toDoItems">,
  });
  const isDraggingChildOfThisProject = Boolean(
    draggedItemId && children?.some((c) => c._id === draggedItemId)
  );
  // Gate nested highlight: if this instance is used as a nested card (childDraggedOverItemId is used upstream),
  // only show the bar when dragging a child of this project. Top-level usage remains unaffected.
  const isDraggedOver =
    draggedOverItemId === _id &&
    (!childDraggedOverItemId || isDraggingChildOfThisProject);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const deleteChildItem = useMutation(api.toDoItems.deleteItem);
  const toggleChildComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteProject = useMutation(api.toDoItems.deleteProject); // uncommented this line for testing purposes
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  const setExpandedMutation = useMutation(api.toDoItems.setExpanded);
  const [isExpanded, setIsExpanded] = useState(expanded ?? true);

  useEffect(() => {
    setIsExpanded(expanded ?? true);
  }, [expanded]);

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

  // children query moved above

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragOver = (id: string, e?: React.DragEvent) => {
    // Only log if it's a different item than the one being dragged
    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      // Only set nested dragged-over targets if we're dragging one of this project's children
      if (isDraggingChildOfThisProject) {
        const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(id);
        if (isDateContainer) {
          setChildDraggedOverItemId(id);
        } else {
          setChildDraggedOverItemId(id);
        }
      } else {
        // Clear nested highlight for cross-layer drags
        setChildDraggedOverItemId(null);
      }
      // onDragOver?.(id, e);
    }

    // Also forward to parent for calendar-level handling
    onDragOver?.(id, e as React.DragEvent);
  };
  const handleDragEnd = async (id: string) => {
    console.log("================================================");
    console.log("childDraggedOverItemId", childDraggedOverItemId);
    if (childDraggedOverItemId) {
      console.log("Finished dragging item in projectCard.tsx on line 87:", id);
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(
        childDraggedOverItemId
      );
      const isDateItem = /^\d{4}-\d{2}-\d{2}[a-z0-9]+$/.test(
        childDraggedOverItemId
      );
      console.log("isDateContainer", isDateContainer);
      console.log("isDateItem", isDateItem);
      const draggedItem = children?.find((item) => item._id === draggedItemId);
      const draggedOverItem = children?.find(
        (item) => item._id === childDraggedOverItemId
      );
      console.log("Dragged item:", draggedItem);
      console.log(
        "Dragged over item in projectCard.tsx on line 78:",
        draggedOverItem
      );
      console.log("Dragged over item id:", childDraggedOverItemId);
      console.log("Dragged over item:", draggedOverItem);
      if (isDateItem && draggedItem) {
        console.log("Assigning item to date:", childDraggedOverItemId);
        try {
          await assignItemToDate({
            id: draggedItem._id as Id<"toDoItems">,
            date: childDraggedOverItemId,
          });
        } catch (error) {
          console.error("Failed to assign item to date:", error);
        }
      } else if (draggedItem && (draggedOverItem || isDateContainer)) {
        console.log("Dragged item and dragged over item CP");
        let movingItemNewOrder = draggedOverItem?.mainOrder || 0;
        const maxMainOrder = (children?.length || 0) + 1;

        const movingItemOldOrder = draggedItem?.mainOrder || movingItemNewOrder;
        if (isDateContainer) {
          movingItemNewOrder = maxMainOrder;
        }
        const difference = movingItemNewOrder - movingItemOldOrder;
        console.log("Difference:", difference);
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
          const item = children?.find((item) => (item.mainOrder ?? -1) === i);
          if (item) {
            updateOrder({
              id: item._id as Id<"toDoItems">,
              order: item.mainOrder! - interval,
            });
          }
        }
        updateOrder({
          id: draggedItemId as Id<"toDoItems">,
          order: movingItemNewOrder,
        });
      }
    }
    setDraggedItemId(null);
    setChildDraggedOverItemId(null);
    console.log("Finished dragging item:", id);
  };

  const handleDragEnter = (id: string) => {
    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      const draggedOverChild = children?.find((item) => item._id === id);
      if (draggedOverChild || id === "child-bottom") {
        setChildDraggedOverItemId(id);
        console.log(
          "Entered child item, setting childDraggedOverItemId to:",
          id
        );
      }
    }

    // Forward to parent
    onDragEnter?.(id);
  };

  const handleDragLeave = (id: string) => {
    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      console.log("Left item:", id);
    }

    // Forward to parent
    onDragLeave?.(id);
  };
  const handleDelete = () => {
    deleteProject({ id: _id as Id<"toDoItems"> });
    if (setAdditionParentId) {
      setAdditionParentId(null);
    }
  };

  return (
    <div className="relative">
      <div
        key={_id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", _id);
          onDragStart?.(_id);
        }}
        onDragEnd={() => {
          onDragEnd?.(_id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
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
        className={`backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 shadow-lg hover:shadow-xl group cursor-move relative ${color
            ? ""
            : completed
              ? "bg-purple-900/20 border-purple-700/20 opacity-75 hover:opacity-100"
              : "bg-purple-900/30 border-purple-700/30 hover:border-purple-600/50"
          }`}
        style={
          color
            ? {
              backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${completed ? 0.12 : 0.18})`,
              borderColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.6)`,
            }
            : undefined
        }
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
            className={`h-5 w-5 rounded border-slate-600 bg-slate-700 focus:ring-offset-0 transition-colors duration-200 ${completed
                ? "text-purple-600 focus:ring-purple-500"
                : "text-purple-600 focus:ring-purple-500"
              }`}
          />
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={async () => {
                  const next = !isExpanded;
                  setIsExpanded(next);
                  try {
                    await setExpandedMutation({
                      id: _id as Id<"toDoItems">,
                      expanded: next,
                    });
                  } catch { }
                }}
                className="text-white text-sm mr-2 transition-colors"
              >
                <svg
                  className={`w-4 h-4 mr-1 transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0"
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
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="left"
                align="center"
                sideOffset={12}
                collisionPadding={8}
                className="z-[9999] rounded-md bg-slate-900/95 text-white text-xs px-2 py-1 border border-slate-700 shadow-md whitespace-pre"
              >
                {isExpanded ? "Collapse project" : "Expand project"}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <div className="relative group flex-1 min-w-0">
            <span
              ref={textRef}
              className={`block truncate transition-colors duration-200 font-medium`}
              onMouseEnter={measure}
            >
              {text}
            </span>
            {/* {isTruncated && (
              <div className="absolute left-[-150px] bottom-full mb-1 z-[999] max-w-[40ch] break-words whitespace-normal px-2 py-1 rounded bg-slate-900/95 text-slate-200 text-xs border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
                {`Content: ${text}`}
              </div>
            )} */}
          </div>
          {isTruncated && (
            <div className="absolute left-0 bottom-full mb-1 z-[999] w-fit max-w-full break-words whitespace-normal px-2 py-1 rounded bg-slate-900/95 text-slate-200 text-xs border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
              {`${text}`}
            </div>
          )}
          
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            title="Delete project"
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
        </div>
      </div>

      {isDraggedOver && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-purple-500 rounded-full z-10"></div>
      )}

      {children && children.length > 0 && isExpanded && (
        <div className="ml-6 mt-3 flex flex-col gap-2 border-l-2 border-purple-700/30 pl-4">
          {children.map((child) => (
            <ItemCard
              key={child._id}
              _id={child._id}
              text={child.text}
              completed={child.completed}
              toggleComplete={async () => {
                await toggleChildComplete({ id: child._id as Id<"toDoItems"> });
                playCompletionPop();
              }}
              deleteItem={() =>
                deleteChildItem({ id: child._id as Id<"toDoItems"> })
              }
              onDragStart={() => handleDragStart(child._id)}
              onDragEnd={() => handleDragEnd(child._id)}
              onDragOver={(id) => handleDragOver(id)}
              onDragEnter={() => handleDragEnter(child._id)}
              onDragLeave={() => handleDragLeave(child._id)}
              draggedOverItemId={childDraggedOverItemId}
              mainOrder={child.mainOrder ?? 0}
              setAdditionParentId={setAdditionParentId}
              type={child.type || "task"}
              draggedItemId={draggedItemId}
              setDraggedItemId={setDraggedItemId}
              setChildDraggedOverItemId={setChildDraggedOverItemId}
              childDraggedOverItemId={childDraggedOverItemId}
              childDraggedItemId={null}
              expanded={child.expanded}
              color={child.color}
            />
          ))}
        </div>
      )}
    </div>
  );
};
