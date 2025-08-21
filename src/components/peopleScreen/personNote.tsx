import { useState, type ReactNode } from "react";
import Image from "next/image";
import { api } from "../../../convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { Id } from "../../../convex/_generated/dataModel";
import { api as convexApi } from "../../../convex/_generated/api";

type DateIdea = {
  title: string;
  links: string[];
  notes: string;
  photos: string[];
};

type DateIdeaDraft = {
  title: string;
  links: string[];
  notes: string;
  photos: string[];
  linkInput: string;
  photoInput: string;
};

function safeImageSrc(src?: string) {
  if (!src) return undefined;
  if (src === "N/A") return undefined;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return undefined;
}

function toExternalHref(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  if (trimmed.startsWith("www.")) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

function linkifyText(text: string): ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const elements: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) elements.push(before);
    const rawUrl = match[0];
    elements.push(
      <a
        key={`link-${match.index}`}
        href={toExternalHref(rawUrl)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "underline", wordBreak: "break-word" }}
      >
        {rawUrl}
      </a>
    );
    lastIndex = match.index + rawUrl.length;
  }
  const after = text.slice(lastIndex);
  if (after) elements.push(after);
  return elements;
}

type PersonDataForDateIdeas = { dateIdeas?: DateIdea[] } | null | undefined;

type AddDateIdeaFn = (args: {
  personId: Id<"people">;
  title: string;
  links: string[];
  notes: string;
  photos: string[];
}) => Promise<unknown>;

type RemoveDateIdeaFn = (args: {
  personId: Id<"people">;
  index: number;
}) => Promise<unknown>;

type GetUploadUrlFn = (
  args: Record<string, never>
) => Promise<{ uploadUrl: string }>;

type GetSignedUrlsFn = (args: {
  ids: Id<"_storage">[];
}) => Promise<{ id: Id<"_storage">; url: string | null }[]>;

export default function PersonNote({
  personId,
  onDeleted,
}: {
  personId: Id<"people">;
  onDeleted?: () => void;
}) {
  const personData = useQuery(api.peopleData.get, {
    personId: personId,
  });
  const toggleItem = useMutation(api.peopleData.toggleItem);
  const addItem = useMutation(api.peopleData.addItem);
  const clearCategory = useMutation(api.peopleData.clearCategory);
  const removeItem = useMutation(api.peopleData.removeItem);
  const searchMovies = useAction(api.peopleData.searchMovies);
  const addMovieByImdbId = useAction(api.peopleData.addMovieByImdbId);
  const searchTvShows = useAction(api.peopleData.searchTvShows);
  const addTvShowByImdbId = useAction(api.peopleData.addTvShowByImdbId);
  const searchBooks = useAction(api.peopleData.searchBooks);
  const addBookByKey = useAction(api.peopleData.addBookByKey);
  const addDateIdea = useMutation(api.peopleData.addDateIdea);
  const removeDateIdea = useMutation(api.peopleData.removeDateIdea);
  const updateDateIdea = useMutation(api.peopleData.updateDateIdea);
  const getUploadUrl = useAction(api.peopleData.getUploadUrl);
  const getSignedUrls = useAction(api.peopleData.getSignedUrls);
  const updateBasicInfo = useMutation(convexApi.peopleData.updateBasicInfo);
  const deletePerson = useMutation(api.people.deletePerson);
  const updatePersonPhoto = useMutation(convexApi.people.updatePhoto);
  const peopleList = useQuery(api.people.get);
  const currentPerson = peopleList?.find((p) => p._id === personId);

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

  // Tabs
  type TabKey = "basic" | Category | "dateIdeas" | "settings";
  const [activeTab, setActiveTab] = useState<TabKey>("basic");
  const allTabs: { key: TabKey; label: string }[] = [
    { key: "basic", label: "Basic Info" },
    ...categories,
    { key: "dateIdeas", label: "Date Ideas" },
    { key: "settings", label: "Settings" },
  ];

  // Persist Date Ideas draft while navigating tabs
  const [dateIdeaDraft, setDateIdeaDraft] = useState<DateIdeaDraft>({
    title: "",
    links: [],
    notes: "",
    photos: [],
    linkInput: "",
    photoInput: "",
  });
  const [profilePhotoInput, setProfilePhotoInput] = useState("");
  const [profileIsDragging, setProfileIsDragging] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [cropImgDims, setCropImgDims] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const cropBoxSize = 240;

  async function uploadProfilePhoto(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    // Open cropper for first file
    const file = list[0];
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result));
      setCropScale(1);
      setCropOffset({ x: 0, y: 0 });
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function uploadCroppedDataUrl(dataUrl: string) {
    setProfileUploading(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const { uploadUrl } = await getUploadUrl({});
      const resp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/png" },
        body: blob,
      });
      if (!resp.ok) return;
      const json = (await resp.json()) as { storageId: Id<"_storage"> };
      const signed = await getSignedUrls({ ids: [json.storageId] });
      const url = signed?.[0]?.url;
      if (url) await updatePersonPhoto({ id: personId, photo: url });
    } finally {
      setProfileUploading(false);
    }
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function Section({ keyName, label }: { keyName: Category; label: string }) {
    const items = personData?.[keyName] as
      | { text: string; completed: boolean }[]
      | undefined;
    const hasItems = !!items && items.length > 0;
    const isMovies = keyName === "movies";
    const isTv = keyName === "tvShows";
    const isBooks = keyName === "books";
    const isMedia = isMovies || isTv || isBooks;
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
              const details = isMedia
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
                    {isMedia && details && (
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
                  {isMedia && details && isOpen && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 10,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        background: "var(--surface-2)",
                        display: "grid",
                        gridTemplateColumns: safeImageSrc(details.poster)
                          ? "64px 1fr"
                          : "1fr",
                        gap: 12,
                      }}
                    >
                      {safeImageSrc(details.poster) && (
                        <Image
                          src={safeImageSrc(details.poster) as string}
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
            placeholderText="Add a movie..."
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
        ) : keyName === "tvShows" ? (
          <MoviesInput
            placeholderText="Add a TV show..."
            onSubmitText={(value) => handleAdd(keyName, value)}
            onChooseSuggestion={async (s) => {
              await addTvShowByImdbId({
                personId,
                imdbId: s.imdbID,
                titleFallback: s.Title,
              });
            }}
            onSearch={async (q) => {
              return await searchTvShows({ query: q });
            }}
          />
        ) : keyName === "books" ? (
          <MoviesInput
            placeholderText="Add a book..."
            onSubmitText={(value) => handleAdd(keyName, value)}
            onChooseSuggestion={async (s: {
              imdbID: string;
              Title: string;
            }) => {
              await addBookByKey({
                personId,
                workKey: s.imdbID,
                titleFallback: s.Title,
              });
            }}
            onSearch={async (q) => {
              const results = await searchBooks({ query: q });
              return results.map(
                (r: {
                  key: string;
                  title: string;
                  first_publish_year?: number;
                  cover_i?: number;
                  subject?: string[];
                }) => ({
                  imdbID: r.key, // reuse field name for key
                  Title: r.title,
                  Year: r.first_publish_year
                    ? String(r.first_publish_year)
                    : "",
                  Poster: r.cover_i
                    ? `https://covers.openlibrary.org/b/id/${r.cover_i}-M.jpg`
                    : undefined,
                  Plot: undefined,
                  Genre: Array.isArray(r.subject)
                    ? r.subject.slice(0, 4).join(", ")
                    : undefined,
                  Runtime: undefined,
                })
              );
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
    placeholderText = "Add a movie...",
    onSubmitText,
    onChooseSuggestion,
    onSearch,
  }: {
    placeholderText?: string;
    onSubmitText: (value: string) => void;
    onChooseSuggestion: (s: {
      imdbID: string;
      Title: string;
      Year: string;
      Poster?: string;
      Plot?: string;
      Genre?: string;
      Runtime?: string;
    }) => void | Promise<void>;
    onSearch: (q: string) => Promise<
      {
        imdbID: string;
        Title: string;
        Year: string;
        Poster?: string;
        Plot?: string;
        Genre?: string;
        Runtime?: string;
      }[]
    >;
  }) {
    const [value, setValue] = useState("");
    const [suggestions, setSuggestions] = useState<
      {
        imdbID: string;
        Title: string;
        Year: string;
        Poster?: string;
        Plot?: string;
        Genre?: string;
        Runtime?: string;
      }[]
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
            placeholder={placeholderText}
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
          {loading && <Spinner size={16} />}
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
                        padding: 0,
                        background: "transparent",
                        border: "none",
                        color: "var(--foreground)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: safeImageSrc(s.Poster)
                            ? "40px 1fr"
                            : "1fr",
                          gap: 10,
                          padding: "10px 12px",
                        }}
                      >
                        {safeImageSrc(s.Poster) && (
                          <Image
                            src={safeImageSrc(s.Poster) as string}
                            alt={s.Title}
                            width={40}
                            height={60}
                            style={{
                              objectFit: "cover",
                              borderRadius: 4,
                              border: "1px solid var(--border)",
                            }}
                          />
                        )}
                        <div style={{ fontSize: 13 }}>
                          <div>
                            <strong>{s.Title}</strong>
                            {s.Year ? ` (${s.Year})` : ""}
                          </div>
                          <div style={{ color: "var(--muted)", marginTop: 4 }}>
                            {[s.Runtime, s.Genre].filter(Boolean).join(" • ")}
                          </div>
                          {s.Plot && (
                            <div
                              style={{ color: "var(--muted)", marginTop: 4 }}
                            >
                              {s.Plot}
                            </div>
                          )}
                        </div>
                      </div>
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

  function Spinner({ size = 16 }: { size?: number }) {
    const s = size;
    const stroke = "var(--muted)";
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 50 50"
        role="status"
        aria-label="Loading"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeOpacity="0.2"
        />
        <path
          d="M25 5 a20 20 0 0 1 0 40 a20 20 0 0 1 0 -40"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 25 25"
            to="360 25 25"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    );
  }

  function BasicInfo() {
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingBirthday, setIsEditingBirthday] = useState(false);
    const [isEditingAnniversary, setIsEditingAnniversary] = useState(false);
    const [nameInput, setNameInput] = useState(personData?.name ?? "");
    const [birthdayInput, setBirthdayInput] = useState(
      personData?.birthday ?? ""
    );
    const [anniversaryInput, setAnniversaryInput] = useState(
      personData &&
        typeof (personData as Record<string, unknown>).anniversary === "string"
        ? ((personData as Record<string, unknown>).anniversary as string)
        : ""
    );
    const existingCustom: {
      label: string;
      value?: string;
      list?: string[];
      ordered?: boolean;
    }[] =
      (personData &&
      Array.isArray((personData as Record<string, unknown>).customInfo)
        ? ((
            personData as {
              customInfo?: {
                label: string;
                value?: string;
                list?: string[];
                ordered?: boolean;
              }[];
            }
          ).customInfo as {
            label: string;
            value?: string;
            list?: string[];
            ordered?: boolean;
          }[])
        : []) || [];
    const [customLabel, setCustomLabel] = useState("");
    const [customValue, setCustomValue] = useState("");
    const [customOpen, setCustomOpen] = useState(false);
    const [customMode, setCustomMode] = useState<"value" | "list">("value");
    const [customListItems, setCustomListItems] = useState<string[]>([]);
    const [customListInput, setCustomListInput] = useState("");
    const [customOrdered, setCustomOrdered] = useState(false);

    // Edit state for existing custom items
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [editMode, setEditMode] = useState<"value" | "list">("value");
    const [editValue, setEditValue] = useState("");
    const [editListItems, setEditListItems] = useState<string[]>([]);
    const [editOrdered, setEditOrdered] = useState(false);
    const [editListInput, setEditListInput] = useState("");

    const beginEdit = (idx: number) => {
      const item = existingCustom[idx];
      setEditingIdx(idx);
      setEditLabel(item.label);
      if (Array.isArray(item.list) && item.list.length > 0) {
        setEditMode("list");
        setEditListItems(item.list);
        setEditOrdered(!!item.ordered);
        setEditValue("");
      } else {
        setEditMode("value");
        setEditValue(item.value ?? "");
        setEditListItems([]);
        setEditOrdered(false);
      }
      setEditListInput("");
    };

    const saveEdit = async () => {
      if (editingIdx === null) return;
      const updated = existingCustom.map((ci, i) =>
        i === editingIdx
          ? editMode === "value"
            ? { label: editLabel.trim() || ci.label, value: editValue }
            : {
                label: editLabel.trim() || ci.label,
                list: editListItems,
                ordered: editOrdered,
              }
          : ci
      );
      await updateBasicInfo({ personId, customInfo: updated });
      setEditingIdx(null);
      setEditLabel("");
      setEditValue("");
      setEditListItems([]);
      setEditOrdered(false);
      setEditListInput("");
    };

    const deleteCustom = async (idx: number) => {
      const updated = existingCustom.filter((_, i) => i !== idx);
      await updateBasicInfo({ personId, customInfo: updated });
      if (editingIdx === idx) setEditingIdx(null);
    };

    // Calendar modal state
    const [showCalendar, setShowCalendar] = useState<
      null | "birthday" | "anniversary"
    >(null);

    // Helpers for mm/dd/yyyy
    const formatMMDDYYYY = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    };
    const parseMMDDYYYY = (s: string): Date | null => {
      const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s);
      if (!m) return null;
      const month = Number(m[1]);
      const day = Number(m[2]);
      const year = Number(m[3]);
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return null;
      return d;
    };

    const save = async () => {
      await updateBasicInfo({
        personId,
        name: nameInput,
        birthday: birthdayInput,
        anniversary: anniversaryInput,
        customInfo: existingCustom,
      });
      setIsEditingName(false);
      setIsEditingBirthday(false);
      setIsEditingAnniversary(false);
      setShowCalendar(null);
    };

    // Lightweight calendar modal
    function CalendarModal({
      initial,
      onSelect,
      onClose,
    }: {
      initial: string;
      onSelect: (value: string) => void;
      onClose: () => void;
    }) {
      const base = parseMMDDYYYY(initial) ?? new Date();
      const [month, setMonth] = useState(base.getMonth());
      const [year, setYear] = useState(base.getFullYear());

      const start = new Date(year, month, 1);
      const startDay = start.getDay(); // 0-6
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const prevMonth = () => {
        const d = new Date(year, month, 1);
        d.setMonth(month - 1);
        setMonth(d.getMonth());
        setYear(d.getFullYear());
      };
      const nextMonth = () => {
        const d = new Date(year, month, 1);
        d.setMonth(month + 1);
        setMonth(d.getMonth());
        setYear(d.getFullYear());
      };

      const weeks: (number | null)[][] = [];
      let current = 1;
      for (let w = 0; w < 6; w++) {
        const row: (number | null)[] = [];
        for (let d = 0; d < 7; d++) {
          const cellIndex = w * 7 + d;
          if (cellIndex < startDay || current > daysInMonth) {
            row.push(null);
          } else {
            row.push(current++);
          }
        }
        weeks.push(row);
        if (current > daysInMonth) break;
      }

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      const currentYear = new Date().getFullYear();
      const years = Array.from(
        { length: 200 },
        (_, i) => currentYear - 150 + i
      );

      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              minWidth: 300,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
            >
              <button
                onClick={prevMonth}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                ‹
              </button>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "transparent",
                    color: "var(--foreground)",
                    padding: "6px 8px",
                  }}
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx} style={{ color: "#000" }}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "transparent",
                    color: "var(--foreground)",
                    padding: "6px 8px",
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y} style={{ color: "#000" }}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={nextMonth}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                ›
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
              }}
            >
              {dayNames.map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: 12,
                  }}
                >
                  {d}
                </div>
              ))}
              {weeks.map((row, ri) =>
                row.map((day, ci) => (
                  <button
                    key={`${ri}-${ci}`}
                    disabled={day === null}
                    onClick={() => {
                      if (day === null) return;
                      const selected = new Date(year, month, day);
                      onSelect(formatMMDDYYYY(selected));
                      onClose();
                    }}
                    style={{
                      height: 34,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: day ? "transparent" : "var(--surface-2)",
                      color: "var(--foreground)",
                      cursor: day ? "pointer" : "default",
                    }}
                  >
                    {day ?? ""}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    const renderRow = (
      label: string,
      value: string | undefined,
      isEditing: boolean,
      setIsEditing: (b: boolean) => void,
      input: string,
      setInput: (v: string) => void,
      placeholder: string,
      isDate?: boolean,
      calendarKey?: "birthday" | "anniversary"
    ) => {
      const computeDaysUntil = (s?: string | null): number | null => {
        if (!s) return null;
        const d = parseMMDDYYYY(s);
        if (!d) return null;
        const now = new Date();
        const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        const next =
          thisYear < now
            ? new Date(now.getFullYear() + 1, d.getMonth(), d.getDate())
            : thisYear;
        const diffMs = next.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      };
      // Choose source based on editing state
      const daysUntil = isDate
        ? computeDaysUntil(isEditing ? input : (value ?? null))
        : null;
      const hue =
        daysUntil !== null
          ? Math.max(
              0,
              Math.min(120, 120 * (1 - Math.min(daysUntil, 365) / 365))
            )
          : null;
      const daysBadge =
        daysUntil !== null ? (
          <span style={{ color: `hsl(${hue} 80% 60%)`, fontSize: 13 }}>
            {daysUntil === 0 ? "Today" : `${daysUntil} days`}
          </span>
        ) : null;

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 120, color: "var(--muted)" }}>{label}</div>
          {!value || isEditing ? (
            <>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
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
              {isDate && (
                <button
                  onClick={() => setShowCalendar(calendarKey ?? null)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  Pick
                </button>
              )}
              {isDate && daysBadge}
              <button
                onClick={save}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span>{value}</span>
                {isDate && daysBadge}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </>
          )}
        </div>
      );
    };

    return (
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>Basic Info</div>
        {renderRow(
          "Name",
          personData?.name,
          isEditingName,
          setIsEditingName,
          nameInput,
          setNameInput,
          "Enter name"
        )}
        {renderRow(
          "Birthday",
          personData?.birthday,
          isEditingBirthday,
          setIsEditingBirthday,
          birthdayInput,
          setBirthdayInput,
          "mm/dd/yyyy",
          true,
          "birthday"
        )}
        {renderRow(
          "Anniversary",
          personData &&
            typeof (personData as Record<string, unknown>).anniversary ===
              "string"
            ? ((personData as Record<string, unknown>).anniversary as string)
            : undefined,
          isEditingAnniversary,
          setIsEditingAnniversary,
          anniversaryInput,
          setAnniversaryInput,
          "mm/dd/yyyy",
          true,
          "anniversary"
        )}
        {/* Custom Info */}
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div style={{ fontWeight: 600 }}>Custom Info</div>
            <button
              onClick={() => setCustomOpen((o) => !o)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              {customOpen ? "Close" : "Add"}
            </button>
          </div>
          {existingCustom.length > 0 && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: 6,
              }}
            >
              {existingCustom.map((ci, idx) => (
                <li
                  key={`${ci.label}-${idx}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr auto",
                    alignItems: "start",
                    gap: 8,
                  }}
                >
                  <div style={{ width: 140, color: "var(--muted)" }}>
                    {ci.label}
                  </div>
                  <div style={{ flex: 1 }}>
                    {editingIdx === idx ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Label"
                            style={{
                              width: 180,
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              padding: "8px 10px",
                              background: "transparent",
                              color: "var(--foreground)",
                            }}
                          />
                          <select
                            value={editMode}
                            onChange={(e) =>
                              setEditMode(e.target.value as "value" | "list")
                            }
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              background: "transparent",
                              color: "var(--foreground)",
                              padding: "8px 10px",
                            }}
                          >
                            <option value="value" style={{ color: "#000" }}>
                              Value
                            </option>
                            <option value="list" style={{ color: "#000" }}>
                              List
                            </option>
                          </select>
                        </div>
                        {editMode === "value" ? (
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Value"
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 10,
                              padding: "8px 10px",
                              background: "transparent",
                              color: "var(--foreground)",
                            }}
                          />
                        ) : (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              <input
                                value={editListInput}
                                onChange={(e) =>
                                  setEditListInput(e.target.value)
                                }
                                placeholder="List item"
                                style={{
                                  flex: 1,
                                  border: "1px solid var(--border)",
                                  borderRadius: 10,
                                  padding: "8px 10px",
                                  background: "transparent",
                                  color: "var(--foreground)",
                                }}
                              />
                              <button
                                onClick={() => {
                                  const v = editListInput.trim();
                                  if (!v) return;
                                  setEditListItems((arr) => [...arr, v]);
                                  setEditListInput("");
                                }}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--foreground)",
                                  cursor: "pointer",
                                }}
                              >
                                Add item
                              </button>
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={editOrdered}
                                  onChange={(e) =>
                                    setEditOrdered(e.target.checked)
                                  }
                                />
                                Ordered
                              </label>
                            </div>
                            {editListItems.length > 0 && (
                              <ul
                                style={{
                                  listStyle: editOrdered ? "decimal" : "disc",
                                  paddingLeft: 20,
                                  margin: 0,
                                }}
                              >
                                {editListItems.map((it, i) => (
                                  <li
                                    key={i}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                  >
                                    <span style={{ flex: 1 }}>{it}</span>
                                    <button
                                      onClick={() =>
                                        setEditListItems((arr) =>
                                          arr.filter((_, j) => j !== i)
                                        )
                                      }
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                        background: "transparent",
                                        color: "var(--foreground)",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    ) : Array.isArray(ci.list) && ci.list.length > 0 ? (
                      ci.ordered ? (
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            listStyleType: "decimal",
                            listStylePosition: "outside",
                          }}
                        >
                          {ci.list.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ol>
                      ) : (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            listStyleType: "disc",
                            listStylePosition: "outside",
                          }}
                        >
                          {ci.list.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      )
                    ) : (
                      <span>{ci.value}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {editingIdx === idx ? (
                      <>
                        <button
                          onClick={saveEdit}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--foreground)",
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIdx(null)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--foreground)",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => beginEdit(idx)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--foreground)",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCustom(idx)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "#ef4444",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {customOpen && (
            <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Label"
                  style={{
                    width: 180,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: "transparent",
                    color: "var(--foreground)",
                  }}
                />
                <select
                  value={customMode}
                  onChange={(e) =>
                    setCustomMode(e.target.value as "value" | "list")
                  }
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--foreground)",
                    padding: "8px 10px",
                  }}
                >
                  <option value="value" style={{ color: "#000" }}>
                    Value
                  </option>
                  <option value="list" style={{ color: "#000" }}>
                    List
                  </option>
                </select>
              </div>
              {customMode === "value" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Value"
                    style={{
                      flex: 1,
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "transparent",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      value={customListInput}
                      onChange={(e) => setCustomListInput(e.target.value)}
                      placeholder="List item"
                      style={{
                        flex: 1,
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: "transparent",
                        color: "var(--foreground)",
                      }}
                    />
                    <button
                      onClick={() => {
                        const v = customListInput.trim();
                        if (!v) return;
                        setCustomListItems((arr) => [...arr, v]);
                        setCustomListInput("");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--foreground)",
                        cursor: "pointer",
                      }}
                    >
                      Add item
                    </button>
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <input
                        type="checkbox"
                        checked={customOrdered}
                        onChange={(e) => setCustomOrdered(e.target.checked)}
                      />
                      Ordered
                    </label>
                  </div>
                  {customListItems.length > 0 && (
                    <ul
                      style={{ listStyle: "disc", paddingLeft: 20, margin: 0 }}
                    >
                      {customListItems.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    if (!customLabel.trim()) return;
                    const toAdd =
                      customMode === "value"
                        ? { label: customLabel.trim(), value: customValue }
                        : {
                            label: customLabel.trim(),
                            list: customListItems,
                            ordered: customOrdered,
                          };
                    const updated = [...existingCustom, toAdd];
                    await updateBasicInfo({ personId, customInfo: updated });
                    setCustomLabel("");
                    setCustomValue("");
                    setCustomListItems([]);
                    setCustomOrdered(false);
                    setCustomOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  Save custom
                </button>
                <button
                  onClick={() => {
                    setCustomLabel("");
                    setCustomValue("");
                    setCustomListItems([]);
                    setCustomOrdered(false);
                    setCustomOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {showCalendar && (
          <CalendarModal
            initial={
              showCalendar === "birthday" ? birthdayInput : anniversaryInput
            }
            onSelect={(val) =>
              showCalendar === "birthday"
                ? setBirthdayInput(val)
                : setAnniversaryInput(val)
            }
            onClose={() => setShowCalendar(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div>
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            borderBottom: "1px solid var(--border)",
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {allTabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                data-selected={isActive ? "true" : "false"}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: isActive ? "var(--surface-2)" : "transparent",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isActive
                    ? "0 0 0 1px var(--accent) inset"
                    : "none",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {activeTab === "basic" ? (
          <BasicInfo />
        ) : activeTab === "dateIdeas" ? (
          <DateIdeasView
            personId={personId}
            personData={personData as PersonDataForDateIdeas}
            draft={dateIdeaDraft}
            setDraft={setDateIdeaDraft}
            addDateIdea={addDateIdea}
            removeDateIdea={removeDateIdea}
            updateDateIdea={updateDateIdea}
            getUploadUrl={getUploadUrl}
            getSignedUrls={getSignedUrls}
          />
        ) : activeTab === "settings" ? (
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>Danger Zone</div>
            <button
              onClick={async () => {
                await deletePerson({ id: personId });
                if (onDeleted) onDeleted();
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #7f1d1d",
                background: "#7f1d1d22",
                color: "#ef4444",
                cursor: "pointer",
              }}
            >
              Delete Person
            </button>

            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "8px 0",
              }}
            />
            <div style={{ fontWeight: 600 }}>Profile Photo</div>
            {currentPerson?.photo && (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  marginBottom: 8,
                }}
              >
                {safeImageSrc(currentPerson.photo) ? (
                  <img
                    src={safeImageSrc(currentPerson.photo) as string}
                    alt="profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div style={{ padding: 12, color: "var(--muted)" }}>
                    Invalid URL
                  </div>
                )}
              </div>
            )}
            {!profileEditOpen ? (
              <div>
                <button
                  onClick={() => setProfileEditOpen(true)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  Edit Photo
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setProfileIsDragging(true);
                  }}
                  onDragLeave={() => setProfileIsDragging(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setProfileIsDragging(false);
                    if (
                      e.dataTransfer.files &&
                      e.dataTransfer.files.length > 0
                    ) {
                      await uploadProfilePhoto(e.dataTransfer.files);
                      e.dataTransfer.clearData();
                    }
                  }}
                  style={{
                    border: `1px dashed ${profileIsDragging ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 10,
                    padding: 12,
                    background: "var(--surface-2)",
                    color: "var(--muted)",
                  }}
                >
                  Drag & drop a profile photo here, or paste a URL below.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Paste image URL (https://...)"
                    value={profilePhotoInput}
                    onChange={(e) => setProfilePhotoInput(e.target.value)}
                    style={{
                      flex: 1,
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "transparent",
                      color: "var(--foreground)",
                    }}
                  />
                  <button
                    onClick={async () => {
                      const url = profilePhotoInput.trim();
                      if (!url) return;
                      await updatePersonPhoto({ id: personId, photo: url });
                      setProfilePhotoInput("");
                      setProfileEditOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--foreground)",
                    }}
                  >
                    {profileUploading ? "Uploading..." : "Save Photo"}
                  </button>
                  <button
                    onClick={() => {
                      setProfilePhotoInput("");
                      setProfileIsDragging(false);
                      setProfileEditOpen(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--foreground)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Section
            keyName={activeTab as Category}
            label={categories.find((c) => c.key === activeTab)?.label || ""}
          />
        )}
        {cropOpen && cropSrc && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "#00000088",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>Crop Photo</div>
              <div
                style={{
                  width: cropBoxSize,
                  height: cropBoxSize,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  position: "relative",
                  touchAction: "none",
                  background: "#000",
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.05 : 0.05;
                  setCropScale((s) => clamp(s + delta, 0.2, 3));
                }}
                onPointerDown={(e) => {
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const start = { ...cropOffset };
                  function move(ev: PointerEvent) {
                    setCropOffset({
                      x: start.x + (ev.clientX - startX),
                      y: start.y + (ev.clientY - startY),
                    });
                  }
                  function up() {
                    window.removeEventListener("pointermove", move);
                    window.removeEventListener("pointerup", up);
                  }
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
              >
                <img
                  src={cropSrc}
                  alt="to-crop"
                  onLoad={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    setCropImgDims({
                      w: img.naturalWidth,
                      h: img.naturalHeight,
                    });
                  }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                    userSelect: "none",
                    pointerEvents: "none",
                    maxWidth: "none",
                  }}
                />
              </div>
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.01}
                value={cropScale}
                onChange={(e) => setCropScale(Number(e.target.value))}
              />
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => {
                    setCropOpen(false);
                    setCropSrc(null);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!cropSrc) return;
                    const canvas = document.createElement("canvas");
                    const size = cropBoxSize;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    const img = document.createElement("img");
                    await new Promise<void>((resolve, reject) => {
                      img.onload = () => resolve();
                      img.onerror = () => reject();
                      img.src = cropSrc;
                    });
                    ctx.clearRect(0, 0, size, size);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    const drawW = img.width * cropScale;
                    const drawH = img.height * cropScale;
                    const cx = size / 2 + cropOffset.x;
                    const cy = size / 2 + cropOffset.y;
                    ctx.drawImage(
                      img,
                      cx - drawW / 2,
                      cy - drawH / 2,
                      drawW,
                      drawH
                    );
                    ctx.restore();
                    const dataUrl = canvas.toDataURL("image/png");
                    await uploadCroppedDataUrl(dataUrl);
                    setCropOpen(false);
                    setCropSrc(null);
                    setProfileEditOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                  }}
                >
                  Save Crop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DateIdeasView({
  personId,
  personData,
  draft,
  setDraft,
  addDateIdea,
  removeDateIdea,
  updateDateIdea,
  getUploadUrl,
  getSignedUrls,
}: {
  personId: Id<"people">;
  personData: PersonDataForDateIdeas;
  draft: DateIdeaDraft;
  setDraft: React.Dispatch<React.SetStateAction<DateIdeaDraft>>;
  addDateIdea: AddDateIdeaFn;
  removeDateIdea: RemoveDateIdeaFn;
  updateDateIdea: (args: {
    personId: Id<"people">;
    index: number;
    title?: string;
    links?: string[];
    notes?: string;
    photos?: string[];
  }) => Promise<unknown>;
  getUploadUrl: GetUploadUrlFn;
  getSignedUrls: GetSignedUrlsFn;
}) {
  const ideas = (personData?.dateIdeas as DateIdea[] | undefined) || [];
  const [isDragging, setIsDragging] = useState(false);

  // Edit state for existing ideas
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLinks, setEditLinks] = useState<string[]>([]);
  const [editLinkInput, setEditLinkInput] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);

  const addLink = () => {
    const l = draft.linkInput.trim();
    if (!l) return;
    setDraft((d) => ({ ...d, links: [...d.links, l], linkInput: "" }));
  };
  const addPhoto = () => {
    const p = draft.photoInput.trim();
    if (!p) return;
    setDraft((d) => ({ ...d, photos: [...d.photos, p], photoInput: "" }));
  };

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    const { uploadUrl } = await getUploadUrl({});
    const uploadedIds: Id<"_storage">[] = [];
    for (const file of list) {
      // Convex expects the raw file body with the correct Content-Type header
      const contentType =
        file.type ||
        (file.name.endsWith(".png")
          ? "image/png"
          : file.name.match(/\.jpe?g$/i)
            ? "image/jpeg"
            : "application/octet-stream");
      const resp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!resp.ok) continue;
      const json = (await resp.json()) as { storageId: Id<"_storage"> };
      uploadedIds.push(json.storageId);
    }
    if (uploadedIds.length > 0) {
      const signed = await getSignedUrls({ ids: uploadedIds });
      const urls = signed
        .map((s) => s.url)
        .filter((u): u is string => typeof u === "string");
      if (urls.length > 0) {
        if (editingIdx !== null) setEditPhotos((prev) => [...prev, ...urls]);
        else setDraft((d) => ({ ...d, photos: [...d.photos, ...urls] }));
      }
    }
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const onPaste: React.ClipboardEventHandler<
    HTMLTextAreaElement | HTMLDivElement
  > = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) await uploadFiles(files);
  };

  const saveIdea = async () => {
    if (!draft.title.trim()) return;
    await addDateIdea({
      personId,
      title: draft.title.trim(),
      links: draft.links,
      notes: draft.notes,
      photos: draft.photos,
    });
    setDraft({
      title: "",
      links: [],
      notes: "",
      photos: [],
      linkInput: "",
      photoInput: "",
    });
  };

  const beginEditIdea = (idx: number) => {
    const idea = ideas[idx];
    setEditingIdx(idx);
    setEditTitle(idea.title);
    setEditNotes(idea.notes);
    setEditLinks(idea.links);
    setEditLinkInput("");
    setEditPhotos(idea.photos);
  };

  const saveEditIdea = async () => {
    if (editingIdx === null) return;
    await updateDateIdea({
      personId,
      index: editingIdx,
      title: editTitle,
      links: editLinks,
      notes: editNotes,
      photos: editPhotos,
    });
    setEditingIdx(null);
    setEditTitle("");
    setEditNotes("");
    setEditLinks([]);
    setEditPhotos([]);
    setEditLinkInput("");
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Date idea title"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 12px",
              background: "transparent",
              color: "var(--foreground)",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={draft.linkInput}
              onChange={(e) =>
                setDraft((d) => ({ ...d, linkInput: e.target.value }))
              }
              placeholder="Add helpful link (https://...)"
              onKeyDown={(e) => {
                if (e.key === "Enter") addLink();
              }}
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
              onClick={addLink}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--foreground)",
              }}
            >
              Add link
            </button>
          </div>
          {draft.links.length > 0 && (
            <ul style={{ listStyle: "disc", paddingLeft: 20, margin: 0 }}>
              {draft.links.map((l, i) => (
                <li key={i} style={{ color: "var(--muted)" }}>
                  <a
                    href={toExternalHref(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--muted)",
                      textDecoration: "underline",
                      wordBreak: "break-word",
                    }}
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Notes"
            rows={4}
            onPaste={onPaste}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "10px 12px",
              background: "transparent",
              color: "var(--foreground)",
              resize: "vertical",
            }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onPaste={onPaste}
            style={{
              border: `1px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 10,
              padding: 12,
              background: "var(--surface-2)",
              color: "var(--muted)",
            }}
          >
            Drag & drop photos here, paste images, or add a photo URL below.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={draft.photoInput}
              onChange={(e) =>
                setDraft((d) => ({ ...d, photoInput: e.target.value }))
              }
              placeholder="Add photo URL (https://...)"
              onKeyDown={(e) => {
                if (e.key === "Enter") addPhoto();
              }}
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
              onClick={addPhoto}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--foreground)",
              }}
            >
              Add photo
            </button>
          </div>
          {draft.photos.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 8,
              }}
            >
              {draft.photos.map((p, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--surface-2)",
                  }}
                >
                  {safeImageSrc(p) ? (
                    <img
                      src={safeImageSrc(p) as string}
                      alt={`photo-${i}`}
                      style={{ width: "100%", height: 180, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ padding: 12, color: "var(--muted)" }}>
                      Invalid URL
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={saveIdea}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--foreground)",
              }}
            >
              Save idea
            </button>
          </div>
        </div>
      </div>
      {ideas && ideas.length > 0 && (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Saved ideas</div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 12,
            }}
          >
            {ideas.map((idea, idx) => (
              <li
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                {editingIdx === idx ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: "transparent",
                        color: "var(--foreground)",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={editLinkInput}
                        onChange={(e) => setEditLinkInput(e.target.value)}
                        placeholder="Add link (https://...)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const l = editLinkInput.trim();
                            if (!l) return;
                            setEditLinks((arr) => [...arr, l]);
                            setEditLinkInput("");
                          }
                        }}
                        style={{
                          flex: 1,
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "8px 10px",
                          background: "transparent",
                          color: "var(--foreground)",
                        }}
                      />
                      <button
                        onClick={() => {
                          const l = editLinkInput.trim();
                          if (!l) return;
                          setEditLinks((arr) => [...arr, l]);
                          setEditLinkInput("");
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--foreground)",
                        }}
                      >
                        Add link
                      </button>
                    </div>
                    {editLinks.length > 0 && (
                      <ul
                        style={{
                          listStyle: "disc",
                          paddingLeft: 20,
                          margin: 0,
                        }}
                      >
                        {editLinks.map((l, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <a
                              href={toExternalHref(l)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                color: "var(--muted)",
                                textDecoration: "underline",
                                wordBreak: "break-word",
                              }}
                            >
                              {l}
                            </a>
                            <button
                              onClick={() =>
                                setEditLinks((arr) =>
                                  arr.filter((_, j) => j !== i)
                                )
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                background: "transparent",
                                color: "var(--foreground)",
                              }}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes"
                      rows={3}
                      onPaste={onPaste}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: "transparent",
                        color: "var(--foreground)",
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                      onPaste={onPaste}
                      style={{
                        border: `1px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 10,
                        padding: 12,
                        background: "var(--surface-2)",
                        color: "var(--muted)",
                      }}
                    >
                      Drag & drop photos here, paste images, or add a photo URL
                      below.
                    </div>
                    {editPhotos.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(100px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {editPhotos.map((p, i) => (
                          <div
                            key={i}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              overflow: "hidden",
                              background: "var(--surface-2)",
                            }}
                          >
                            {safeImageSrc(p) ? (
                              <img
                                src={safeImageSrc(p) as string}
                                alt={`photo-${i}`}
                                style={{
                                  width: "100%",
                                  height: 180,
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{ padding: 12, color: "var(--muted)" }}
                              >
                                Invalid URL
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={saveEditIdea}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--foreground)",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingIdx(null)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--foreground)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ fontWeight: 600, flex: 1 }}>
                        {idea.title}
                      </div>
                      <button
                        onClick={() => beginEditIdea(idx)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "var(--foreground)",
                          marginRight: 8,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeDateIdea({ personId, index: idx })}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "transparent",
                          color: "#ef4444",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    {idea.links?.length > 0 && (
                      <ul
                        style={{
                          listStyle: "disc",
                          paddingLeft: 20,
                          marginTop: 6,
                        }}
                      >
                        {idea.links.map((l, i) => (
                          <li key={i} style={{ color: "var(--muted)" }}>
                            <a
                              href={toExternalHref(l)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "var(--muted)",
                                textDecoration: "underline",
                                wordBreak: "break-word",
                              }}
                            >
                              {l}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {idea.notes && (
                      <div style={{ color: "var(--muted)", marginTop: 6 }}>
                        {linkifyText(idea.notes)}
                      </div>
                    )}
                    {idea.photos?.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(100px, 1fr))",
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        {idea.photos.map((p, i) => (
                          <div
                            key={i}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              overflow: "hidden",
                            }}
                          >
                            {safeImageSrc(p) ? (
                              <img
                                src={safeImageSrc(p) as string}
                                alt={`photo-${i}`}
                                style={{
                                  width: "100%",
                                  height: 180,
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{ padding: 12, color: "var(--muted)" }}
                              >
                                Invalid URL
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
