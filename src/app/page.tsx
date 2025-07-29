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
import { TaskCard } from "@/components/itemCards/home/taskCard";
import { Id } from "../../convex/_generated/dataModel";
import HomeScreen from "./screens/home";
import CalendarScreen from "./screens/calendar";

export default function Home() {
  const { isLoading, isAuthenticated } = useStoreUserEffect();
  const [screen, setScreen] = useState<"home" | "calendar">("home");

  // Create item state and functions
  const toDoItems = useQuery(api.toDoItems.get);
  const createToDoItem = useMutation(api.toDoItems.create);
  const createChild = useMutation(api.projects.createChild);
  const [text, setText] = useState("");
  const [itemTypeToAdd, setItemTypeToAdd] = useState<
    "task" | "project" | "folder"
  >("task");
  const [additionParentId, setAdditionParentId] =
    useState<Id<"toDoItems"> | null>(null);

  const zeroLevelItems =
    toDoItems?.filter((item) => item.parentId === undefined) || [];
  const activeTasks = zeroLevelItems?.filter((item) => !item.completed) || [];
  const maxMainOrder = (activeTasks.length || 0) + 1;

  const handleAdd = () => {
    if (additionParentId) {
      if (text.trim()) {
        createChild({
          parentId: additionParentId,
          text: text.trim(),
          type: itemTypeToAdd,
        });
        setText("");
      }
    } else {
      if (text.trim()) {
        createToDoItem({
          text: text.trim(),
          order: maxMainOrder,
          type: itemTypeToAdd,
        });
        setText("");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      <Authenticated>
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
          <div className="w-full px-8 py-4">
            {/* Header row with title, creation form, and navigation */}
            <div className="flex justify-between items-center gap-8">
              {/* Title */}
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Astraea Tasks</h1>
                <p className="text-slate-300 text-sm">
                  Organize your life, one task at a time
                </p>
              </div>

              {/* Create Item Section */}
              <div className="flex-1 max-w-3xl">
                <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                  <div className="flex items-center gap-3">
                    {/* Type Selection */}
                    <div className="flex gap-2">
                      {[
                        {
                          type: "task",
                          icon: "📝",
                          label: "Task",
                          color: "blue",
                        },
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
                          onClick={() =>
                            setItemTypeToAdd(
                              type as "task" | "project" | "folder"
                            )
                          }
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all duration-200 font-medium text-xs ${
                            itemTypeToAdd === type
                              ? color === "blue"
                                ? "bg-blue-600/20 border-blue-500 text-blue-300"
                                : color === "purple"
                                  ? "bg-purple-600/20 border-purple-500 text-purple-300"
                                  : "bg-green-600/20 border-green-500 text-green-300"
                              : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <span className="text-xs">{icon}</span>
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Parent Selection Display */}
                    {additionParentId && (
                      <div className="flex items-center gap-2 bg-purple-900/20 px-2 py-1 rounded-lg border border-purple-500/30">
                        <span className="text-purple-400 text-xs">📁</span>
                        <span className="text-xs font-medium text-purple-300">
                          {
                            toDoItems?.find(
                              (item) => item._id === additionParentId
                            )?.text
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
                          placeholder={`Create a new ${itemTypeToAdd}...`}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        />
                        {text && (
                          <button
                            onClick={() => setText("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-600/50 text-slate-400 hover:text-slate-300"
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
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-sm"
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

              {/* Navigation */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <UserButton />
                <button
                  onClick={() => setScreen("calendar")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-lg"
                >
                  Calendar
                </button>
                <button
                  onClick={() => setScreen("home")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-lg"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-8 py-8">
          <Content
            setScreen={setScreen}
            screen={screen}
            setAdditionParentId={setAdditionParentId}
          />
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

function Content({
  setScreen,
  screen,
  setAdditionParentId,
}: {
  setScreen: (screen: "home" | "calendar") => void;
  screen: "home" | "calendar";
  setAdditionParentId: (id: Id<"toDoItems"> | null) => void;
}) {
  return (
    <div>
      {screen === "home" && (
        <HomeScreen setAdditionParentId={setAdditionParentId} />
      )}
      {screen === "calendar" && <CalendarScreen />}
    </div>
  );
}
