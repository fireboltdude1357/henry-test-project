import { TaskCard } from "./taskCard";
import { ProjectCard } from "./projectCard";
import { Id } from "../../../../convex/_generated/dataModel";

interface ItemCardProps {
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
  setAdditionParentId?: (id: Id<"toDoItems"> | null) => void;
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  setChildDraggedOverItemId: (id: string | null) => void;
  childDraggedOverItemId: string | null;
  childDraggedItemId: string | null;
  // Optional UI controls (used by calendar sidebar to simplify visuals)
  forceCollapsed?: boolean;
  disableNestedDnD?: boolean;
  // Control highlight explicitly (same-layer only)
  showHighlight?: boolean;
  // Optional passthrough for child drag state (ignored by TaskCard)
  setChildDraggedItemId?: (id: string | null) => void;
  // Whether the currently dragged item is a nested child (has parentId)
  draggedItemIsChild?: boolean;
  expanded?: boolean;
  color?: string;
  timeEstimateHours?: number | undefined;
  timeEstimateMinutes?: number | undefined;
}

export const ItemCard = ({ type, ...props }: ItemCardProps) => {
  if (type === "project" || type === "folder") {
    return <ProjectCard {...props} />;
  }

  return <TaskCard {...props} />;
};
