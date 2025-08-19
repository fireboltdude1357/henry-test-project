import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMutation } from "convex/react";

export type Person = {
  _id: Id<"people">;
  name: string;
};
export const PersonCard = ({
  person,
  setPersonId,
}: {
  person: Person;
  setPersonId: (id: Id<"people">) => void;
}) => {
  const deletePerson = useMutation(api.people.deletePerson);
  return (
    <div className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2 border border-slate-700/30 h-[300px] w-[200px]">
      <div>{person.name}</div>
      <button onClick={() => setPersonId(person._id)}>View</button>
      <button
        onClick={() => deletePerson({ id: person._id })}
        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        title="Delete person"
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
  );
};
