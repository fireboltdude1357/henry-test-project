"use client";

import React from "react";
import { UserButton } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";

type Screen = "home" | "calendar" | "people";
type ItemType = "task" | "project" | "folder";

type ToDoItem = {
  _id: Id<"toDoItems">;
  text: string;
};

interface AppHeaderProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
  itemTypeToAdd: ItemType;
  setItemTypeToAdd: (t: ItemType) => void;
  additionParentId: Id<"toDoItems"> | null;
  setAdditionParentId: (id: Id<"toDoItems"> | null) => void;
  toDoItems: ToDoItem[] | undefined;
  text: string;
  setText: (t: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleAdd: () => void;
}

export default function AppHeader({
  screen,
  setScreen,
  itemTypeToAdd,
  setItemTypeToAdd,
  additionParentId,
  setAdditionParentId,
  toDoItems,
  text,
  setText,
  handleKeyPress,
  handleAdd,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--surface-2)]/70 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="w-full px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/60 to-purple-500/60 border border-[var(--border)]"></div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {screen === "home"
                  ? "Your Tasks"
                  : screen === "calendar"
                    ? "Calendar"
                    : "People"}
              </h1>
              <p className="text-xs text-slate-400">
                {screen === "home"
                  ? "Capture tasks and projects"
                  : screen === "calendar"
                    ? "Plan and schedule your work"
                    : "Manage your people"}
              </p>
            </div>
          </div>

          {/* Quick add */}
          <div className="flex-1 max-w-3xl mx-auto xl:mx-0">
            <div className="bg-[var(--surface-1)]/60 rounded-xl p-3 border border-[var(--border)]">
              <div className="flex items-center gap-3">
                {/* Type Selection */}
                <div className="flex gap-2">
                  {[
                    { type: "task", icon: "📝", label: "Task", color: "blue" },
                    {
                      type: "project",
                      icon: "📁",
                      label: "Project",
                      color: "purple",
                    },
                    {
                      type: "folder",
                      icon: "🗂️",
                      label: "Folder",
                      color: "green",
                    },
                  ].map(({ type, icon, label, color }) => (
                    <button
                      key={type}
                      onClick={() => setItemTypeToAdd(type as ItemType)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all duration-200 font-medium text-xs ${
                        itemTypeToAdd === (type as ItemType)
                          ? color === "blue"
                            ? "bg-blue-600/20 border-blue-500 text-blue-300"
                            : color === "purple"
                              ? "bg-purple-600/20 border-purple-500 text-purple-300"
                              : "bg-green-600/20 border-green-500 text-green-300"
                          : "bg-slate-800/40 border-[var(--border)] text-slate-300 hover:border-slate-500/50"
                      }`}
                    >
                      <span className="text-xs">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Parent Selection Display */}
                {additionParentId && (
                  <div className="hidden sm:flex items-center gap-2 bg-purple-900/20 px-2 py-1 rounded-lg border border-purple-500/30">
                    <span className="text-purple-400 text-xs">📁</span>
                    <span className="text-xs font-medium text-purple-300 truncate max-w-[160px]">
                      {
                        toDoItems?.find((item) => item._id === additionParentId)
                          ?.text
                      }
                    </span>
                    <button
                      onClick={() => setAdditionParentId(null)}
                      className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      title="Remove from project"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Input and Add Button */}
                <div className="flex-1 flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Quick add a ${itemTypeToAdd}...`}
                      className="w-full bg-slate-900/40 border border-[var(--border)] rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    />
                    {text && (
                      <button
                        onClick={() => setText("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-800/60 text-slate-400 hover:text-slate-300"
                        title="Clear text"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={!text.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700/80 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 text-sm shadow-lg shadow-blue-600/20"
                  >
                    <svg
                      className="w-3 h-3"
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
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setScreen("calendar")}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                screen === "calendar"
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                  : "border-[var(--border)] text-slate-300 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setScreen("home")}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                screen === "home"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
                  : "border-[var(--border)] text-slate-300 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span>Home</span>
            </button>

            <button
              onClick={() => setScreen("people")}
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                screen === "people"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-200"
                  : "border-[var(--border)] text-slate-300 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <span>People</span>
            </button>

            <div className="ml-2">
              <UserButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
