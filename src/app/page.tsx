"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";

import { useStoreUserEffect } from "../useStoreUserEffect";
import { Id } from "../../convex/_generated/dataModel";
import HomeScreen from "./screens/home";
import CalendarScreen from "./screens/calendar";
import AppHeader from "@/components/AppHeader";
import PeopleScreen from "./screens/people";

export default function Home() {
  const { isAuthenticated } = useStoreUserEffect();

  if (!isAuthenticated) {
    return (
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-lg w-full text-center space-y-8 bg-[var(--surface-1)]/60 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-10 shadow-2xl shadow-black/30">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Astraea
              </h1>
              <p className="text-slate-300 text-base">
                Sign in to manage your projects, tasks, and schedule with a
                sleek, modern interface.
              </p>
            </div>
            <SignInButton>
              <button className="inline-flex items-center justify-center bg-blue-600/90 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors duration-200 shadow-lg shadow-blue-600/30">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    );
  } else {
    return <Content />;
  }
}
function Content() {
  // Create item state and functions

  const [screen, setScreen] = useState<"home" | "calendar" | "people">("home");
  const toDoItems = useQuery(api.toDoItems.get);
  const createToDoItem = useMutation(api.toDoItems.create);
  const createChild = useMutation(api.projects.createChild);
  const [text, setText] = useState("");
  const [itemTypeToAdd, setItemTypeToAdd] = useState<
    "task" | "project" | "folder"
  >("task");
  const [additionParentId, setAdditionParentId] =
    useState<Id<"toDoItems"> | null>(null);

  // Calendar view state (lifted for header controls)
  const [calendarNumDays, setCalendarNumDays] = useState<number>(3);
  const [calendarStartDate, setCalendarStartDate] = useState<Date>(new Date());

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
    <div className="min-h-screen flex">
      <Authenticated>
        {/* Sidebar */}
        {/* <aside className="hidden lg:block">
          <div className="px-6 py-5 border-b border-[var(--border)]/60">
            <div className="text-white font-semibold text-lg tracking-tight">
              Astraea
            </div>
            <div className="text-xs text-slate-400">Focus. Organize. Flow.</div>
          </div>
          <nav className="flex-1 p-3">
            <button
              onClick={() => setScreen("home")}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                screen === "home"
                  ? "bg-blue-500/20 text-blue-200 border border-blue-500/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/30"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setScreen("calendar")}
              className={`mt-2 w-full text-left px-3 py-2 rounded-lg transition-colors ${
                screen === "calendar"
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/30"
              }`}
            >
              Calendar
            </button>
          </nav>
          <div className="p-4 border-t border-[var(--border)]/60">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <UserButton />
              <span>Account</span>
            </div>
          </div>
        </aside> */}

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <AppHeader
            screen={screen}
            setScreen={setScreen}
            itemTypeToAdd={itemTypeToAdd}
            setItemTypeToAdd={setItemTypeToAdd}
            additionParentId={additionParentId}
            setAdditionParentId={setAdditionParentId}
            toDoItems={toDoItems}
            text={text}
            setText={setText}
            handleKeyPress={handleKeyPress}
            handleAdd={handleAdd}
          />

          {/* Main Content */}
          <main
            className={`w-full ${
              screen === "calendar"
                ? "px-0 py-0"
                : "max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8"
            }`}
          >
            <PageContent
              screen={screen}
              setAdditionParentId={setAdditionParentId}
              calendarNumDays={calendarNumDays}
              setCalendarNumDays={setCalendarNumDays}
              calendarStartDate={calendarStartDate}
              setCalendarStartDate={setCalendarStartDate}
            />
          </main>
        </div>
      </Authenticated>
    </div>
  );
}

function PageContent({
  screen,
  setAdditionParentId,
  calendarNumDays,
  setCalendarNumDays,
  calendarStartDate,
  setCalendarStartDate,
}: {
  screen: "home" | "calendar" | "people";
  setAdditionParentId: (id: Id<"toDoItems"> | null) => void;
  calendarNumDays: number;
  setCalendarNumDays: (n: number) => void;
  calendarStartDate: Date;
  setCalendarStartDate: (d: Date) => void;
}) {
  return (
    <div>
      {screen === "home" && (
        <HomeScreen setAdditionParentId={setAdditionParentId} />
      )}
      {screen === "calendar" && (
        <CalendarScreen
          numDays={calendarNumDays}
          setNumDays={setCalendarNumDays}
          startDate={calendarStartDate}
          setStartDate={setCalendarStartDate}
        />
      )}
      {screen === "people" && <PeopleScreen />}
    </div>
  );
}
