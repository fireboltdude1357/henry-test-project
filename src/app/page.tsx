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
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (text.trim()) {
      createToDoItem({ text: text.trim() });
      setText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  const activeTasks = toDoItems?.filter((item) => !item.completed) || [];
  const completedTasks = toDoItems?.filter((item) => item.completed) || [];

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
            {activeTasks.map(({ _id, text, completed }) => (
              <div
                key={_id}
                className="bg-slate-800/30 backdrop-blur-sm rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 shadow-lg hover:shadow-xl group"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => toggleComplete({ id: _id })}
                    className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-colors duration-200"
                  />
                  <span className="flex-1 text-white group-hover:text-blue-100 transition-colors duration-200">
                    {text}
                  </span>
                </div>
              </div>
            ))}
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
            {completedTasks.map(({ _id, text, completed }) => (
              <div
                key={_id}
                className="bg-slate-800/20 backdrop-blur-sm rounded-lg p-4 border border-slate-700/20 transition-all duration-200 opacity-75 hover:opacity-100"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => toggleComplete({ id: _id })}
                    className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-700 text-green-600 focus:ring-green-500 focus:ring-offset-0 transition-colors duration-200"
                  />
                  <span className="flex-1 text-slate-400 line-through">
                    {text}
                  </span>
                </div>
              </div>
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
