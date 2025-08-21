import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { PersonCard } from "./personCard";
import { Id } from "../../../convex/_generated/dataModel";

export default function PeopleHome({
  setPersonId,
}: {
  setPersonId: (id: Id<"people">) => void;
}) {
  const [addPersonName, setAddPersonName] = useState("");
  const people = useQuery(api.people.get);
  const addPerson = useMutation(api.people.create);
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (addPersonName.trim() !== "") {
      addPerson({ name: addPersonName });
      setAddPersonName("");
    }
  };
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 pb-4 px-2 sm:px-0">
        <input
          type="text"
          value={addPersonName}
          onChange={(e) => setAddPersonName(e.target.value)}
          className="flex-1 bg-slate-800/30 rounded-lg p-2 border border-slate-700/30 text-sm"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg border border-slate-700/30 text-sm"
        >
          Add
        </button>
      </form>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {people?.map((person) => (
          <PersonCard
            key={person._id}
            person={person}
            setPersonId={setPersonId}
          />
        ))}
      </div>
    </div>
  );
}
