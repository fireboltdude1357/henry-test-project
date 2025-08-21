import { Id } from "../../../convex/_generated/dataModel";

export type Person = {
  _id: Id<"people">;
  name: string;
  photo?: string;
};
export const PersonCard = ({
  person,
  setPersonId,
}: {
  person: Person;
  setPersonId: (id: Id<"people">) => void;
}) => {
  return (
    <button
      onClick={() => setPersonId(person._id)}
      className="relative flex items-end bg-slate-800/30 rounded-lg p-3 sm:p-4 border border-slate-700/30 h-[180px] sm:h-[260px] w-full sm:w-[200px] text-left hover:border-slate-600/60 transition-colors overflow-hidden"
    >
      {person.photo && (
        <img
          src={person.photo}
          alt={person.name}
          className="absolute inset-0 w-full h-full object-cover opacity-40 rounded-none"
        />
      )}
      <div className="relative whitespace-pre-line break-words text-slate-200 text-sm sm:text-base">
        {person.name}
      </div>
    </button>
  );
};
