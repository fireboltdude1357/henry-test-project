import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { playCompletionPop } from "../../../utils/sounds";
import { useEffect, useState } from "react";
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
  // const deleteProject = useMutation(api.toDoItems.deleteProject);
  const assignItemToDate = useMutation(api.toDoItems.assignItemToDate);
  const setExpandedMutation = useMutation(api.toDoItems.setExpanded);
  const [isExpanded, setIsExpanded] = useState(expanded ?? true);

  useEffect(() => {
    setIsExpanded(expanded ?? true);
  }, [expanded]);

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
        className={`backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 shadow-lg hover:shadow-xl group cursor-move relative`}
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
            className={`h-5 w-5 rounded border-slate-600 bg-slate-700 focus:ring-offset-0 transition-colors duration-200 ${
              completed
                ? "text-purple-600 focus:ring-purple-500"
                : "text-purple-600 focus:ring-purple-500"
            }`}
          />
          <button
            onClick={async () => {
              const next = !isExpanded;
              setIsExpanded(next);
              try {
                await setExpandedMutation({
                  id: _id as Id<"toDoItems">,
                  expanded: next,
                });
              } catch {}
            }}
            className="text-white text-sm mr-2 transition-colors"
            title={isExpanded ? "Collapse project" : "Expand project"}
          >
            <svg
              className={`w-4 h-4 mr-1 transition-transform duration-200 ${
                isExpanded ? "rotate-90" : "rotate-0"
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
          <span className={`flex-1 transition-colors duration-200 font-medium`}>
            {text}
          </span>
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
