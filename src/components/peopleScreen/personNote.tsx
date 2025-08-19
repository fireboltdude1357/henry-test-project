import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";

export default function PersonNote({ personId }: { personId: Id<"people"> }) {
  const personData = useQuery(api.peopleData.get, {
    personId: personId,
  });
  const toggleItem = useMutation(api.peopleData.toggleItem);
  const addItem = useMutation(api.peopleData.addItem);
  const clearCategory = useMutation(api.peopleData.clearCategory);
  const removeItem = useMutation(api.peopleData.removeItem);
  const searchMovies = useAction(api.peopleData.searchMovies);
  const addMovieByImdbId = useAction(api.peopleData.addMovieByImdbId);

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
    const isMovies = keyName === "movies";
    type MovieDetails = {
      imdbId: string;
      title: string;
      year?: string;
      poster?: string;
      runtime?: string;
      genre?: string;
      plot?: string;
      ratings?: { source: string; value: string }[];
    };
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const toggleExpanded = (index: number) =>
      setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
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
            {items!.map((item, idx) => {
              const details = isMovies
                ? (item as unknown as { details?: MovieDetails }).details
                : undefined;
              const isOpen = !!expanded[idx];
              return (
                <li
                  key={idx}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "6px 8px",
                    background: "transparent",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
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
                    {isMovies && details && (
                      <button
                        onClick={() => toggleExpanded(idx)}
                        title={isOpen ? "Hide details" : "Show details"}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--foreground)",
                          cursor: "pointer",
                        }}
                      >
                        {isOpen ? "Hide" : "Details"}
                      </button>
                    )}
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
                  {isMovies && details && isOpen && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 10,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        background: "var(--surface-2)",
                        display: "grid",
                        gridTemplateColumns: details.poster
                          ? "64px 1fr"
                          : "1fr",
                        gap: 12,
                      }}
                    >
                      {details.poster && (
                        <img
                          src={details.poster}
                          alt={details.title}
                          width={64}
                          height={96}
                          style={{
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                          }}
                        />
                      )}
                      <div style={{ fontSize: 13, color: "var(--foreground)" }}>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{details.title}</strong>
                          {details.year ? ` (${details.year})` : ""}
                        </div>
                        <div style={{ color: "var(--muted)", marginBottom: 4 }}>
                          {[details.runtime, details.genre]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                        {details.plot && (
                          <div style={{ color: "var(--muted)" }}>
                            {details.plot}
                          </div>
                        )}
                        {details.ratings && details.ratings.length > 0 && (
                          <div style={{ color: "var(--muted)", marginTop: 6 }}>
                            Ratings:{" "}
                            {details.ratings
                              .map((r) => `${r.source} ${r.value}`)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {keyName === "movies" ? (
          <MoviesInput
            onSubmitText={(value) => handleAdd(keyName, value)}
            onChooseSuggestion={async (s) => {
              await addMovieByImdbId({
                personId,
                imdbId: s.imdbID,
                titleFallback: s.Title,
              });
            }}
            onSearch={async (q) => {
              return await searchMovies({ query: q });
            }}
          />
        ) : (
          <CategoryInput
            placeholder={"Add an item..."}
            onSubmit={(value) => handleAdd(keyName, value)}
          />
        )}
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

  function MoviesInput({
    onSubmitText,
    onChooseSuggestion,
    onSearch,
  }: {
    onSubmitText: (value: string) => void;
    onChooseSuggestion: (s: {
      imdbID: string;
      Title: string;
      Year: string;
      Poster?: string;
    }) => void | Promise<void>;
    onSearch: (
      q: string
    ) => Promise<
      { imdbID: string; Title: string; Year: string; Poster?: string }[]
    >;
  }) {
    const [value, setValue] = useState("");
    const [suggestions, setSuggestions] = useState<
      { imdbID: string; Title: string; Year: string; Poster?: string }[]
    >([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Debounced search
    async function runSearch(q: string) {
      setLoading(true);
      try {
        const results = await onSearch(q);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (err) {
        console.error("Movie search failed", err);
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }

    return (
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={value}
            onChange={(e) => {
              const q = e.target.value;
              setValue(q);
              if (q.trim().length >= 2) {
                // simple debounce
                const w = window as unknown as { __movieTimer?: number };
                if (w.__movieTimer) window.clearTimeout(w.__movieTimer);
                w.__movieTimer = window.setTimeout(() => {
                  runSearch(q);
                }, 250);
              } else {
                setSuggestions([]);
                setOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmitText(value);
                setValue("");
                setSuggestions([]);
                setOpen(false);
              }
            }}
            placeholder={"Add a movie..."}
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 12px",
              background: "transparent",
              color: "var(--foreground)",
              width: "100%",
            }}
          />
          <button
            onClick={() => {
              onSubmitText(value);
              setValue("");
              setSuggestions([]);
              setOpen(false);
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
        {open && (
          <div
            style={{
              position: "absolute",
              zIndex: 10,
              top: "100%",
              left: 0,
              right: 0,
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            {loading && (
              <div style={{ padding: 10, color: "var(--muted)" }}>
                Searching…
              </div>
            )}
            {!loading && suggestions.length === 0 && (
              <div style={{ padding: 10, color: "var(--muted)" }}>
                No results
              </div>
            )}
            {!loading && suggestions.length > 0 && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {suggestions.map((s) => (
                  <li key={s.imdbID}>
                    <button
                      onClick={async () => {
                        await onChooseSuggestion(s);
                        setValue("");
                        setSuggestions([]);
                        setOpen(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        color: "var(--foreground)",
                        cursor: "pointer",
                      }}
                    >
                      {s.Title} {s.Year ? `(${s.Year})` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
