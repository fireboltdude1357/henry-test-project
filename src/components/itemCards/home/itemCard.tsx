import { TaskCard } from "./taskCard";
import { ProjectCard } from "./projectCard";
import { Id } from "../../../../convex/_generated/dataModel";

interface ItemCardProps {
  _id: string;
  text: string;
  completed: boolean;
  toggleComplete: (id: string) => void;
  deleteItem: (id: string) => void;
  openTimeMenu: (id: string) => void;
  setTimeEstimate?: (id: string, timeEstimate: number | null) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  onDragOver?: (id: string, e: React.DragEvent) => void;
  onDragEnter?: (id: string) => void;
  onDragLeave?: (id: string) => void;
  draggedOverItemId?: string | null;
  mainOrder: number;
  type: "task" | "project" | "folder";
  setAdditionParentId?: (id: Id<"toDoItems"> | null) => void;
  expanded?: boolean;
  color?: string;
}

export const ItemCard = ({ type, ...props }: ItemCardProps) => {
  if (type === "project" || type === "folder") {
    return <ProjectCard {...props} />;
  }

  return <TaskCard {...props} />;
};
