import { TaskCard } from "@/components/itemCards/home/taskCard";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { ItemCard } from "@/components/itemCards/home/itemCard";
import { HomeDisplay } from "@/components/displayItems/homeDisplay";

export default function HomeScreen({
  setAdditionParentId,
}: {
  setAdditionParentId: (id: Id<"toDoItems"> | null) => void;
}) {
  const toDoItems = useQuery(api.toDoItems.get);
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(
    null
  );

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragEnd = async (id: string) => {
    if (draggedOverItemId) {
      console.log("Finished dragging item in home.tsx:", id);
      const draggedItem = toDoItems?.find((item) => item._id === draggedItemId);
      const draggedOverItem = toDoItems?.find(
        (item) => item._id === draggedOverItemId
      );
      console.log("Dragged item:", draggedItem);
      console.log("Dragged over item:", draggedOverItem);
      console.log("Dragged over item id:", draggedOverItemId);
      console.log("Dragged over item:", draggedOverItem);
      if (draggedItem && (draggedOverItem || draggedOverItemId === "bottom")) {
        console.log("Dragged item and dragged over item CP");
        let movingItemNewOrder = draggedOverItem?.mainOrder || 0;

        const movingItemOldOrder = draggedItem?.mainOrder || movingItemNewOrder;
        if (draggedOverItemId === "bottom") {
          movingItemNewOrder = maxMainOrder;
          // movingItemOldOrder = maxMainOrder;
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
          const item = toDoItems?.find((item) => item.mainOrder === i);
          if (item) {
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
        // updateOrder({
        //   id: draggedOverItemId as Id<"toDoItems">,
        //   order: draggedItem?.mainOrder || 0,
        // });
      }
    }
    setDraggedItemId(null);
    setDraggedOverItemId(null);
    console.log("Finished dragging item in home.tsx on line 89:", id);
    // You can add any additional logic here when drag ends
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    // Only log if it's a different item than the one being dragged
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      const draggedOverItem = toDoItems?.find((item) => item._id === id);
      if (!draggedOverItem?.parentId) {
        // setAdditionParentId(draggedOverItem.parentId);
        setDraggedOverItemId(id);
        console.log("Dragging over item:", id);
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
    // Only log if it's a different item than the one being dragged
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      console.log("Left item:", id);
    }
  };
  const zeroLevelItems =
    toDoItems?.filter((item) => item.parentId === undefined) || [];
  const activeTasks = zeroLevelItems?.filter((item) => !item.completed) || [];
  const completedTasks = zeroLevelItems?.filter((item) => item.completed) || [];
  const maxMainOrder = (activeTasks.length || 0) + 1;

  return (
    <div className="grid grid-cols-[1fr_3fr] gap-8 h-full">
      {/* Left Column - Stats */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Statistics</h2>
        {toDoItems && toDoItems.length > 0 && (
          <div className="space-y-4">
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
              <div className="text-2xl font-bold text-white">
                {toDoItems.length}
              </div>
              <div className="text-slate-300 text-sm">Total Tasks</div>
            </div>
            <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700/30">
              <div className="text-2xl font-bold text-blue-300">
                {activeTasks.length}
              </div>
              <div className="text-slate-300 text-sm">Active Tasks</div>
            </div>
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-700/30">
              <div className="text-2xl font-bold text-green-300">
                {completedTasks.length}
              </div>
              <div className="text-slate-300 text-sm">Completed</div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Active and Completed Tasks */}
      <HomeDisplay
        activeTasks={activeTasks}
        completedTasks={completedTasks}
        setAdditionParentId={setAdditionParentId}
        draggedOverItemId={draggedOverItemId}
        handleDragOver={handleDragOver}
        handleDragEnter={handleDragEnter}
        handleDragLeave={handleDragLeave}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        toggleComplete={(id) => toggleComplete({ id })}
        deleteItem={(id) => deleteItem({ id })}
        toDoItems={toDoItems || []}
      />
    </div>
  );
}
