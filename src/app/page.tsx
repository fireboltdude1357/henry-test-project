"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";

import { useStoreUserEffect } from "../useStoreUserEffect";
import { TaskCard } from "@/components/taskCard";
import { Id } from "../../convex/_generated/dataModel";

export default function Home() {
  const { isLoading, isAuthenticated } = useStoreUserEffect();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <Authenticated>
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Astraea Tasks</h1>
              <p className="text-slate-300 text-sm">
                Organize your life, one task at a time
              </p>
            </div>
            <UserButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          <Content />
        </main>
      </Authenticated>

      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-white">
                Welcome to Astraea
              </h1>
              <p className="text-slate-300 text-lg">
                Sign in to manage your tasks
              </p>
            </div>
            <SignInButton>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}

function Content() {
  const toDoItems = useQuery(api.toDoItems.get);
  const createToDoItem = useMutation(api.toDoItems.create);
  const toggleComplete = useMutation(api.toDoItems.toggleComplete);
  const deleteItem = useMutation(api.toDoItems.deleteItem);
  const updateOrder = useMutation(api.toDoItems.updateOrder);
  const [text, setText] = useState("");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedOverItemId, setDraggedOverItemId] = useState<string | null>(
    null
  );

  const handleAdd = () => {
    if (text.trim()) {
      createToDoItem({ text: text.trim(), order: maxMainOrder });
      setText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
    console.log("Started dragging item:", id);
    // You can add any additional logic here when drag starts
  };

  const handleDragEnd = async (id: string) => {
    if (draggedOverItemId) {
      console.log("Finished dragging item:", id);
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
    console.log("Finished dragging item:", id);
    // You can add any additional logic here when drag ends
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    // Only log if it's a different item than the one being dragged
    if (draggedItemId && draggedItemId !== id && draggedOverItemId !== id) {
      setDraggedOverItemId(id);
      console.log("Dragging over item:", id);
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

  const activeTasks = toDoItems?.filter((item) => !item.completed) || [];
  const completedTasks = toDoItems?.filter((item) => item.completed) || [];

  const maxMainOrder = (activeTasks.length || 0) + 1;

  return (
    <div className="space-y-8">
      {/* Add New Task */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">Add New Task</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="What needs to be done?"
            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Stats */}
      {toDoItems && toDoItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Active Tasks ({activeTasks.length})
          </h3>
          <div className="space-y-3">
            {activeTasks.map(({ _id, text, completed, mainOrder }) => (
              <TaskCard
                key={_id}
                _id={_id}
                text={text}
                completed={completed}
                toggleComplete={() => toggleComplete({ id: _id })}
                deleteItem={() => deleteItem({ id: _id })}
                onDragStart={() => handleDragStart(_id)}
                onDragEnd={() => handleDragEnd(_id)}
                onDragOver={(id, e) => handleDragOver(id, e)}
                onDragEnter={() => handleDragEnter(_id)}
                onDragLeave={() => handleDragLeave(_id)}
                draggedOverItemId={draggedOverItemId}
                mainOrder={mainOrder}
              />
            ))}
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
            {completedTasks.map(({ _id, text, completed, mainOrder }) => (
              <TaskCard
                key={_id}
                _id={_id}
                text={text}
                completed={completed}
                toggleComplete={() => toggleComplete({ id: _id })}
                deleteItem={() => deleteItem({ id: _id })}
                onDragStart={() => handleDragStart(_id)}
                onDragEnd={() => handleDragEnd(_id)}
                onDragOver={(id, e) => handleDragOver(id, e)}
                onDragEnter={() => handleDragEnter(_id)}
                onDragLeave={() => handleDragLeave(_id)}
                draggedOverItemId={draggedOverItemId}
                mainOrder={mainOrder}
              />
            ))}
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
            Add your first task above to get started!
          </p>
        </div>
      )}
    </div>
  );
}
