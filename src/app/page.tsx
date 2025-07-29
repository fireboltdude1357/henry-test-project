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
import HomeScreen from "./screens/home";
import CalendarScreen from "./screens/calendar";

export default function Home() {
  const { isLoading, isAuthenticated } = useStoreUserEffect();
  const [screen, setScreen] = useState<"home" | "calendar">("home");
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
            <div className="flex items-center gap-4">
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
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          <Content setScreen={setScreen} screen={screen} />
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
}: {
  setScreen: (screen: "home" | "calendar") => void;
  screen: "home" | "calendar";
}) {
  return (
    <div>
      {screen === "home" && <HomeScreen />}
      {screen === "calendar" && <CalendarScreen />}
    </div>
  );
}
