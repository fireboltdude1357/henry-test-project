import { Id } from "../../convex/_generated/dataModel";
import { ProjectCard } from "./projectCard";
import { TaskCard } from "./taskCard";

export const ItemCard = ({
  _id,
  text,
  completed,
  toggleComplete,
  deleteItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  draggedOverItemId,
  mainOrder,
  type,
  setAdditionParentId,
}: {
  _id: string;
  text: string;
  completed: boolean;
  toggleComplete: (id: string) => void;
  deleteItem: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  onDragOver?: (id: string, e: React.DragEvent) => void;
  onDragEnter?: (id: string) => void;
  onDragLeave?: (id: string) => void;
  draggedOverItemId?: string | null;
  mainOrder: number;
  type: "task" | "project" | "folder";
  setAdditionParentId: (id: Id<"toDoItems">) => void;
}) => {
  if (type === "project") {
    return (
      <ProjectCard
        _id={_id}
        text={text}
        completed={completed}
        toggleComplete={toggleComplete}
        deleteItem={deleteItem}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        draggedOverItemId={draggedOverItemId}
        mainOrder={mainOrder}
        setAdditionParentId={setAdditionParentId}
      />
    );
  } else if (type === "task") {
    return (
      <TaskCard
        _id={_id}
        text={text}
        completed={completed}
        toggleComplete={toggleComplete}
        deleteItem={deleteItem}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        draggedOverItemId={draggedOverItemId}
        mainOrder={mainOrder}
      />
    );
  }
};
