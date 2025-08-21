import PeopleHome from "@/components/peopleScreen/peopleHome";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import PersonNote from "@/components/peopleScreen/personNote";

export default function PeopleScreen() {
  const [personId, setPersonId] = useState<Id<"people"> | null>(null);
  return (
    <div>
      {personId === null && <PeopleHome setPersonId={setPersonId} />}
      {personId !== null && (
        <PersonNote personId={personId} onDeleted={() => setPersonId(null)} />
      )}
    </div>
  );
}
