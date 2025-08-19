import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";

export default function PersonNote({ personId }: { personId: Id<"people"> }) {
  const personData = useQuery(api.peopleData.get, {
    personId: personId,
  });
  const toggleItem = useMutation(api.peopleData.toggleItem);
  const addItem = useMutation(api.peopleData.addItem);
  const clearCategory = useMutation(api.peopleData.clearCategory);
  const removeItem = useMutation(api.peopleData.removeItem);

  type Category = "movies" | "books" | "tvShows" | "music" | "games" | "other";
  const categories: { key: Category; label: string }[] = [
    { key: "movies", label: "Movies" },
    { key: "books", label: "Books" },
    { key: "tvShows", label: "TV Shows" },
    { key: "music", label: "Music" },
    { key: "games", label: "Games" },
    { key: "other", label: "Other" },
  ];

  const handleToggle = async (
    category: Category,
    index: number,
    currentCompleted: boolean
  ) => {
    await toggleItem({
      personId,
      category,
      index,
      completed: !currentCompleted,
    });
  };

  const handleAdd = async (category: Category, text: string) => {
    if (!text.trim()) return;
    await addItem({ personId, category, text });
  };

  function Section({ keyName, label }: { keyName: Category; label: string }) {
    const items = personData?.[keyName] as
      | { text: string; completed: boolean }[]
      | undefined;
    const hasItems = !!items && items.length > 0;
    return (
      <div
        style={{
          marginBottom: 16,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              margin: 0,
              marginRight: "auto",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: "var(--foreground)",
            }}
          >
            {label}
          </h2>
          <button
            onClick={() => clearCategory({ personId, category: keyName })}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            Delete all
          </button>
        </div>
        {!hasItems && (
          <div
            style={{
              padding: 12,
              border: "1px dashed var(--border)",
              background: "var(--surface-2)",
              borderRadius: 10,
              color: "var(--muted)",
              fontStyle: "italic",
              marginBottom: 8,
            }}
          >
            No {label.toLowerCase()} yet. Add one below.
          </div>
        )}
        {hasItems && (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {items!.map((item, idx) => (
              <li
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "6px 8px",
                  background: "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() =>
                        handleToggle(keyName, idx, item.completed)
                      }
                    />
                    <span
                      style={{
                        textDecoration: item.completed
                          ? "line-through"
                          : "none",
                      }}
                    >
                      {item.text}
                    </span>
                  </label>
                  <button
                    onClick={() =>
                      removeItem({ personId, category: keyName, index: idx })
                    }
                    title="Delete item"
                    style={{
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <CategoryInput
          placeholder={"Add an item..."}
          onSubmit={(value) => handleAdd(keyName, value)}
        />
      </div>
    );
  }

  function CategoryInput({
    placeholder,
    onSubmit,
  }: {
    placeholder: string;
    onSubmit: (value: string) => void;
  }) {
    const [value, setValue] = useState("");
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit(value);
              setValue("");
            }
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            background: "transparent",
            color: "var(--foreground)",
          }}
        />
        <button
          onClick={() => {
            onSubmit(value);
            setValue("");
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>
    );
  }
  return (
    <div>
      <div>
        <h1>{personData?.name}</h1>
        <p>{personData?.birthday}</p>
        {categories.map(({ key, label }) => (
          <Section key={key} keyName={key} label={label} />
        ))}
      </div>
    </div>
  );
}
