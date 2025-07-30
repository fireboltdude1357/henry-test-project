import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import { ItemCard } from "./itemCard";

export const ProjectCard = ({
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
}) => {
  const isDraggedOver = draggedOverItemId === _id;
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const deleteChildItem = useMutation(api.toDoItems.deleteItem);
  const toggleChildComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteProject = useMutation(api.toDoItems.deleteProject);
  const [isExpanded, setIsExpanded] = useState(true);

  const children = useQuery(api.projects.getByParentId, {
    parentId: _id as Id<"toDoItems">,
  });

  const [childDraggedOverItemId, setChildDraggedOverItemId] = useState<
    string | null
  >(null);
  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    // Only log if it's a different item than the one being dragged
    if (
      draggedItemId &&
      draggedItemId !== id &&
      childDraggedOverItemId !== id
    ) {
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(id);
      if (isDateContainer) {
        setChildDraggedOverItemId(id);
        console.log("Dragging over date container:", id);
      } else {
        setChildDraggedOverItemId(id);
        console.log("Dragging over item:", id);
      }
    }
  };
  const handleDragEnd = async (id: string) => {
    console.log("================================================");
    console.log("childDraggedOverItemId", childDraggedOverItemId);
    if (childDraggedOverItemId) {
      console.log("Finished dragging item:", id);
      const isDateContainer = /^\d{4}-\d{2}-\d{2}$/.test(
        childDraggedOverItemId
      );
      console.log("isDateContainer", isDateContainer);
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
          const item = children?.find((item) => item.mainOrder === i);
          if (item) {
            updateOrder({
              id: item._id as Id<"toDoItems">,
              order: item.mainOrder - interval,
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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
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
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={completed}
            onChange={() => toggleComplete(_id)}
            className={`h-5 w-5 rounded border-slate-600 bg-slate-700 focus:ring-offset-0 transition-colors duration-200 ${
              completed
                ? "text-purple-600 focus:ring-purple-500"
                : "text-purple-600 focus:ring-purple-500"
            }`}
          />
          <button
            onClick={toggleExpanded}
            className="flex items-center text-purple-400 text-sm mr-2 hover:text-purple-300 transition-colors"
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
          <span
            className={`flex-1 transition-colors duration-200 font-medium ${
              completed
                ? "text-purple-400 line-through"
                : "text-purple-100 group-hover:text-purple-50"
            }`}
          >
            {text}
            {children && children.length > 0 && (
              <span className="ml-2 text-xs text-purple-400/70">
                ({children.length} item{children.length !== 1 ? "s" : ""})
              </span>
            )}
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
          <span className="text-purple-400 text-xs">({mainOrder})</span>
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

      {children && children.length > 0 && isExpanded && (
        <div className="ml-6 mt-3 flex flex-col gap-2 border-l-2 border-purple-700/30 pl-4">
          {children.map((child) => (
            <ItemCard
              key={child._id}
              _id={child._id}
              text={child.text}
              completed={child.completed}
              toggleComplete={() =>
                toggleChildComplete({ id: child._id as Id<"toDoItems"> })
              }
              deleteItem={() =>
                deleteChildItem({ id: child._id as Id<"toDoItems"> })
              }
              onDragStart={() => handleDragStart(child._id)}
              onDragEnd={() => handleDragEnd(child._id)}
              onDragOver={(id, e) => handleDragOver(id, e)}
              onDragEnter={() => handleDragEnter(child._id)}
              onDragLeave={() => handleDragLeave(child._id)}
              draggedOverItemId={childDraggedOverItemId}
              mainOrder={child.mainOrder}
              setAdditionParentId={setAdditionParentId}
              type={child.type || "task"}
              draggedItemId={draggedItemId}
              setDraggedItemId={setDraggedItemId}
            />
          ))}
          {/* Bottom drop zone for child items */}
          <div
            id="child-bottom"
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver("child-bottom", e);
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
    </div>
  );
};
