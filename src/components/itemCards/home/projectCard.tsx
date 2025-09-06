import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { playCompletionPop } from "../../../utils/sounds";
import { ItemCard } from "./itemCard";

export const ProjectCard = ({
  _id,
  text,
  completed,
  toggleComplete,
  // deleteItem is intentionally unused in this view
  deleteItem: _unusedDelete, // eslint-disable-line @typescript-eslint/no-unused-vars
  openTimeMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  draggedOverItemId,
  mainOrder,
  setAdditionParentId,
  expanded,
  color,
}: {
  _id: string;
  text: string;
  completed: boolean;
  toggleComplete: (id: string) => void;
  deleteItem: (id: string) => void;
  openTimeMenu: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  onDragOver?: (id: string, e: React.DragEvent) => void;
  onDragEnter?: (id: string) => void;
  onDragLeave?: (id: string) => void;
  draggedOverItemId?: string | null;
  mainOrder: number;
  setAdditionParentId?: (id: Id<"toDoItems"> | null) => void;
  expanded?: boolean;
  color?: string;
}) => {
  const isDraggedOver = draggedOverItemId === _id;
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const deleteChildItem = useMutation(api.toDoItems.deleteItem);
  const toggleChildComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteProject = useMutation(api.toDoItems.deleteProject);
  const setExpandedMutation = useMutation(api.toDoItems.setExpanded);
  const [isExpanded, setIsExpanded] = useState(expanded ?? true);
  const setColorMutation = useMutation(api.toDoItems.setColor);
  const [localColor, setLocalColor] = useState<string | undefined>(color);

  useEffect(() => {
    setIsExpanded(expanded ?? true);
  }, [expanded]);

  const children = useQuery(api.projects.getByParentId, {
    parentId: _id as Id<"toDoItems">,
  });
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [childDraggedOverItemId, setChildDraggedOverItemId] = useState<
    string | null
  >(null);
  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragOver = (id: string) => {
    // Only log if it's a different item than the one being dragged
    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      setChildDraggedOverItemId(id);
      console.log("Dragging over item:", id);
    }
  };
  const handleDragEnd = async (id: string) => {
    if (childDraggedOverItemId) {
      console.log("Finished dragging item in projectCard.tsx on line 69:", id);
      const draggedItem = children?.find((item) => item._id === draggedItemId);
      const draggedOverItem = children?.find(
        (item) => item._id === childDraggedOverItemId
      );
      console.log("Dragged item:", draggedItem);
      console.log("Dragged over item:", draggedOverItem);
      console.log("Dragged over item id:", childDraggedOverItemId);
      console.log("Dragged over item:", draggedOverItem);
      if (
        draggedItem &&
        (draggedOverItem || childDraggedOverItemId === "child-bottom")
      ) {
        console.log("Dragged item and dragged over item CP");
        let movingItemNewOrder = draggedOverItem?.mainOrder || 0;
        const maxMainOrder = (children?.length || 0) + 1;

        const movingItemOldOrder = draggedItem?.mainOrder || movingItemNewOrder;
        if (childDraggedOverItemId === "child-bottom") {
          movingItemNewOrder = maxMainOrder;
        }
        const difference = movingItemNewOrder - movingItemOldOrder;
        console.log("Difference:", difference);
        // console.log("Moving item new order:", movingItemNewOrder);
        // console.log("Moving item old order:", movingItemOldOrder);
        let interval = 0;
        if (difference > 0) {
          interval = 1;
          movingItemNewOrder = movingItemNewOrder - 1;
        } else {
          interval = -1;
        }
        // console.log("Updating order for item:", movingItemOldOrder);
        //
        console.log("Moving item new order:", movingItemNewOrder);
        console.log("Moving item old order:", movingItemOldOrder);
        for (
          let i = movingItemOldOrder + interval;
          i !== movingItemNewOrder + interval;
          i += interval
        ) {
          console.log("Updating order for item:", i);
          const item = children?.find((item) => (item.mainOrder ?? -1) === i);
          if (item) {
            updateOrder({
              id: item._id as Id<"toDoItems">,
              order: item.mainOrder! - interval,
            });
          }
        }
        updateOrder({
          //   id: draggedItemId as Id<"toDoItems">,
          id: draggedItemId as Id<"toDoItems">,
          order: movingItemNewOrder,
        });
        // updateOrder({
        //   id: draggedOverItemId as Id<"toDoItems">,
        //   order: draggedItem?.mainOrder || 0,
        // });
      }
    }
    setDraggedItemId(null);
    setChildDraggedOverItemId(null);
    console.log("Finished dragging item:", id);
    // You can add any additional logic here when drag ends
  };

  const handleDragEnter = (id: string) => {
    // Only log if it's a different item than the one being dragged

    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      console.log("Entered item:", id);
    }
  };

  const handleDragLeave = (id: string) => {
    // Only log if it's a different item than the one being dragged
    // console.log("draggedItemId", draggedItemId);
    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      console.log("Left item:", id);
    }
  };
  // console.log("children", children);
  const handleDelete = () => {
    deleteProject({ id: _id as Id<"toDoItems"> });
    if (setAdditionParentId) {
      setAdditionParentId(null);
    }
  };

  const toggleExpanded = async () => {
    const next = !isExpanded;
    setIsExpanded(next);
    try {
      await setExpandedMutation({ id: _id as Id<"toDoItems">, expanded: next });
    } catch {}
  };
  const completedChildren = children?.filter((child) => child.completed);
  const uncompletedChildren = children?.filter((child) => !child.completed);
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
          e.preventDefault(); // Allow dropping
          onDragOver?.(_id, e);
        }}
        onDragEnter={() => {
          onDragEnter?.(_id);
        }}
        onDragLeave={() => {
          onDragLeave?.(_id);
        }}
        className={`backdrop-blur-sm rounded-lg p-4 border transition-all duration-200 shadow-lg hover:shadow-xl group cursor-move ${
          completed
            ? "bg-purple-900/20 border-purple-700/20 opacity-75 hover:opacity-100"
            : "bg-purple-900/30 border-purple-700/30 hover:border-purple-600/50"
        }`}
        style={
          localColor
            ? {
                backgroundColor: `rgba(${parseInt(localColor.slice(1, 3), 16)}, ${parseInt(localColor.slice(3, 5), 16)}, ${parseInt(localColor.slice(5, 7), 16)}, 0.12)`,
                borderColor: `rgba(${parseInt(localColor.slice(1, 3), 16)}, ${parseInt(localColor.slice(3, 5), 16)}, ${parseInt(localColor.slice(5, 7), 16)}, 0.6)`,
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
            onClick={toggleExpanded}
            className="flex items-center text-sm mr-2 transition-colors"
            style={{ color: "#ffffff" }}
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
            📁
          </button>
          {/* Color picker */}
          <div className="relative">
            <label
              htmlFor={`color-${_id}`}
              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all duration-200 cursor-pointer"
              title="Set color"
            >
              🎨
            </label>
            <input
              id={`color-${_id}`}
              type="color"
              value={localColor || "#6b21a8"}
              onChange={async (e) => {
                const next = e.target.value;
                setLocalColor(next);
                try {
                  await setColorMutation({
                    id: _id as Id<"toDoItems">,
                    color: next,
                  });
                } catch {}
              }}
              className="absolute left-0 top-0 opacity-0 w-0 h-0 pointer-events-none"
            />
          </div>
          <span
            className={`flex-1 transition-colors duration-200 font-medium ${
              completed
                ? "text-purple-400 line-through"
                : "text-purple-100 group-hover:text-purple-50"
            }`}
          >
            {text}
            {uncompletedChildren && uncompletedChildren.length > 0 && (
              <span className="ml-2 text-xs text-purple-400/70">
                ({uncompletedChildren.length} item
                {uncompletedChildren.length !== 1 ? "s" : ""})
              </span>
            )}
            <span className="text-slate-400 text-[10px] sm:text-xs ml-2">({0}h {0}m)</span>
          </span>
          {setAdditionParentId && (
            <button
              onClick={() => setAdditionParentId(_id as Id<"toDoItems">)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              title="Add child"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
          <span className="text-white text-xs">({mainOrder})</span>
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
        <div className="absolute top-[-6px] left-0 right-0 h-[3px] bg-purple-500 rounded-full"></div>
      )}

      {uncompletedChildren && uncompletedChildren.length > 0 && isExpanded && (
        <div className="ml-6 mt-3 flex flex-col gap-2 border-l-2 border-purple-700/30 pl-4">
          {uncompletedChildren.map((child) => (
            <ItemCard
              key={child._id}
              _id={child._id}
              text={child.text}
              completed={child.completed}
              toggleComplete={async () => {
                const wasCompleted = child.completed;
                await toggleChildComplete({ id: child._id as Id<"toDoItems"> });
                if (!wasCompleted) playCompletionPop();
              }}
              deleteItem={() =>
                deleteChildItem({ id: child._id as Id<"toDoItems"> })
              }
              openTimeMenu={() => openTimeMenu(child._id)}
              onDragStart={() => handleDragStart(child._id)}
              onDragEnd={() => handleDragEnd(child._id)}
              onDragOver={(id) => handleDragOver(id)}
              onDragEnter={() => handleDragEnter(child._id)}
              onDragLeave={() => handleDragLeave(child._id)}
              draggedOverItemId={childDraggedOverItemId}
              mainOrder={child.mainOrder ?? 0}
              setAdditionParentId={setAdditionParentId}
              type={child.type || "task"}
              expanded={child.expanded}
              color={child.color}
              timeEstimateHours={child.timeEstimateHours}
              timeEstimateMinutes={child.timeEstimateMinutes}
            />
          ))}
          {/* Bottom drop zone for child items */}
          <div
            id="child-bottom"
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver("child-bottom");
            }}
            onDragEnter={() => handleDragEnter("child-bottom")}
            onDragLeave={() => handleDragLeave("child-bottom")}
            className="h-[1px] w-full relative"
          >
            {childDraggedOverItemId === "child-bottom" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500 rounded-full"></div>
            )}
          </div>
        </div>
      )}
      {completedChildren && completedChildren.length > 0 && isExpanded && (
        <div className="ml-6 mt-3 flex flex-col gap-2 border-l-2 border-purple-700/30 pl-4">
          {completedChildren.map((child) => (
            <ItemCard
              key={child._id}
              _id={child._id}
              text={child.text}
              completed={child.completed}
              toggleComplete={async () => {
                const wasCompleted = child.completed;
                await toggleChildComplete({ id: child._id as Id<"toDoItems"> });
                if (!wasCompleted) playCompletionPop();
              }}
              deleteItem={() =>
                deleteChildItem({ id: child._id as Id<"toDoItems"> })
              }
              openTimeMenu={() => openTimeMenu(child._id)}
              mainOrder={child.mainOrder ?? 0}
              type={child.type || "task"}
              expanded={child.expanded}
              color={child.color}
              timeEstimateHours={child.timeEstimateHours}
              timeEstimateMinutes={child.timeEstimateMinutes}
            />
          ))}
        </div>
      )}
    </div>
  );
};
