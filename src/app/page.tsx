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
  // const toDoItems = useQuery(api.toDoItems.get);
  // const createToDoItem = useMutation(api.toDoItems.create);
  // console.log("toDoItems:", toDoItems);

  // const [text, setText] = useState("");
  // const handleAdd = () => {
  //   createToDoItem({ text });
  // };
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Authenticated>
        <UserButton />
        <Content />
      </Authenticated>
      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>
    </main>
  );
}

function Content() {
  const toDoItems = useQuery(api.toDoItems.get);
  const createToDoItem = useMutation(api.toDoItems.create);
  console.log("toDoItems:", toDoItems);

  const [text, setText] = useState("");
  const handleAdd = () => {
    createToDoItem({ text });
  };
  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="border-2 border-white p-2"
      />
      <button onClick={handleAdd}>Add</button>
      {toDoItems?.map(({ _id, text }) => (
        <div key={_id} className="border-2 border-white p-2">
          {text}
        </div>
      ))}
    </div>
  );
}
