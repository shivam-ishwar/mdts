import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Tooltip } from "antd";
import {
    BoldOutlined,
    CloseOutlined,
    CodeOutlined,
    DeleteOutlined,
    FileAddOutlined,
    ItalicOutlined,
    MessageOutlined,
    OrderedListOutlined,
    SmileOutlined,
    TableOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import "../styles/notepad.css";

type NoteRecord = {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

const LEGACY_STORAGE_KEY = "mdts:notepad-content";
const NOTES_STORAGE_KEY = "mdts:notepad-notes";
const EMOJIS = ["😀", "🎯", "✅", "🚀", "📝", "🔥", "💡", "📌", "📊", "🎉"];

const createNote = (): NoteRecord => {
    const timestamp = new Date().toISOString();
    return {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "",
        content: "<p></p>",
        createdAt: timestamp,
        updatedAt: timestamp,
    };
};

const stripHtml = (html: string) =>
    html
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const formatUpdatedAt = (rawDate: string) =>
    new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(rawDate));

const loadNotes = (): NoteRecord[] => {
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (storedNotes) {
        try {
            const parsed = JSON.parse(storedNotes);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // Ignore malformed storage and fall back to migration/default note.
        }
    }

    const legacyContent = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyContent) {
        const migrated = [{ ...createNote(), title: "Untitled note", content: legacyContent }];
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
    }

    const starterNote = [{ ...createNote(), title: "Welcome note" }];
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(starterNote));
    return starterNote;
};

const Notepad = () => {
    const [notes, setNotes] = useState<NoteRecord[]>(() => loadNotes());
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [showEmojis, setShowEmojis] = useState(false);
    const activeNoteIdRef = useRef<string | null>(null);
    const emojiWrapRef = useRef<HTMLDivElement | null>(null);

    const activeNote = useMemo(
        () => notes.find((note) => note.id === activeNoteId) ?? null,
        [notes, activeNoteId]
    );
    const activeNoteIsEmpty = useMemo(
        () => !activeNote || stripHtml(activeNote.content) === "",
        [activeNote]
    );

    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: "<p></p>",
        autofocus: false,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "notepad-editor",
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            const currentNoteId = activeNoteIdRef.current;
            if (!currentNoteId) return;
            const nextHtml = currentEditor.getHTML();
            const updatedAt = new Date().toISOString();
            setNotes((currentNotes) =>
                currentNotes.map((note) =>
                    note.id === currentNoteId ? { ...note, content: nextHtml, updatedAt } : note
                )
            );
        },
    });

    useEffect(() => {
        activeNoteIdRef.current = activeNoteId;
    }, [activeNoteId]);

    useEffect(() => {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }, [notes]);

    useEffect(() => {
        if (!editor) return;
        if (!activeNote) {
            editor.commands.setContent("<p></p>", { emitUpdate: false });
            return;
        }
        if (editor.getHTML() !== activeNote.content) {
            editor.commands.setContent(activeNote.content || "<p></p>", { emitUpdate: false });
        }
        setShowEmojis(false);
    }, [activeNote, editor]);

    useEffect(() => {
        if (!showEmojis) return;

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (emojiWrapRef.current && target && !emojiWrapRef.current.contains(target)) {
                setShowEmojis(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [showEmojis]);

    const sortedNotes = useMemo(
        () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        [notes]
    );

    const handleCreateNote = () => {
        const newNote = createNote();
        setNotes((currentNotes) => [newNote, ...currentNotes]);
        setActiveNoteId(newNote.id);
    };

    const handleOpenNote = (noteId: string) => {
        setActiveNoteId(noteId);
    };

    const handleCloseEditor = () => {
        setActiveNoteId(null);
        setShowEmojis(false);
    };

    const handleDeleteNote = (noteId: string) => {
        const remainingNotes = notes.filter((note) => note.id !== noteId);
        const nextNotes = remainingNotes.length ? remainingNotes : [createNote()];
        setNotes(nextNotes);
        if (activeNoteId === noteId) {
            setActiveNoteId(null);
        }
    };

    const handleUpdateTitle = (title: string) => {
        if (!activeNoteId) return;
        const updatedAt = new Date().toISOString();
        setNotes((currentNotes) =>
            currentNotes.map((note) =>
                note.id === activeNoteId ? { ...note, title, updatedAt } : note
            )
        );
    };

    const toolbarButtons = [
        {
            icon: <BoldOutlined />,
            title: "Bold",
            isActive: editor?.isActive("bold"),
            onClick: () => editor?.chain().focus().toggleBold().run(),
        },
        {
            icon: <ItalicOutlined />,
            title: "Italic",
            isActive: editor?.isActive("italic"),
            onClick: () => editor?.chain().focus().toggleItalic().run(),
        },
        {
            icon: <span className="notepad-badge-icon">H1</span>,
            title: "Heading",
            isActive: editor?.isActive("heading", { level: 1 }),
            onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
            icon: <span className="notepad-badge-icon">H2</span>,
            title: "Subheading",
            isActive: editor?.isActive("heading", { level: 2 }),
            onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
            icon: <UnorderedListOutlined />,
            title: "Bullet List",
            isActive: editor?.isActive("bulletList"),
            onClick: () => editor?.chain().focus().toggleBulletList().run(),
        },
        {
            icon: <OrderedListOutlined />,
            title: "Numbered List",
            isActive: editor?.isActive("orderedList"),
            onClick: () => editor?.chain().focus().toggleOrderedList().run(),
        },
        {
            icon: <MessageOutlined />,
            title: "Quote",
            isActive: editor?.isActive("blockquote"),
            onClick: () => editor?.chain().focus().toggleBlockquote().run(),
        },
        {
            icon: <CodeOutlined />,
            title: "Code Block",
            isActive: editor?.isActive("codeBlock"),
            onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
        },
        {
            icon: <TableOutlined />,
            title: "Insert Table",
            isActive: editor?.isActive("table"),
            onClick: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
    ];

    const tableButtons = [
        { icon: <span className="notepad-badge-icon">+R</span>, title: "Add Row Below", onClick: () => editor?.chain().focus().addRowAfter().run() },
        { icon: <span className="notepad-badge-icon">+C</span>, title: "Add Column After", onClick: () => editor?.chain().focus().addColumnAfter().run() },
        { icon: <span className="notepad-badge-icon">-R</span>, title: "Delete Row", onClick: () => editor?.chain().focus().deleteRow().run() },
        { icon: <span className="notepad-badge-icon">-C</span>, title: "Delete Column", onClick: () => editor?.chain().focus().deleteColumn().run() },
        { icon: <span className="notepad-badge-icon">TH</span>, title: "Toggle Header Cell", onClick: () => editor?.chain().focus().toggleHeaderCell().run() },
        { icon: <DeleteOutlined />, title: "Delete Table", onClick: () => editor?.chain().focus().deleteTable().run() },
    ];

    return (
        <div className="notepad-page">
            <div className="notepad-home-shell">
                <div className="notepad-home-hero">
                    <div>
                        <p className="notepad-title">Notes</p>
                        <p className="notepad-subtitle">Create quick notes, revisit them from the list, and open any note into a full editor.</p>
                    </div>
                    <Tooltip title="Create note 📝" placement="left">
                        <button
                            type="button"
                            className="notepad-primary-btn notepad-icon-btn"
                            onClick={handleCreateNote}
                            aria-label="Create note"
                        >
                            <FileAddOutlined />
                        </button>
                    </Tooltip>
                </div>

                <div className="notepad-list-shell">
                    {sortedNotes.map((note) => {
                        const preview = stripHtml(note.content) || "Start writing...";
                        const title = note.title.trim() || "Untitled note";
                        return (
                            <button
                                key={note.id}
                                type="button"
                                className="notepad-note-card"
                                onClick={() => handleOpenNote(note.id)}
                            >
                                <div className="notepad-note-card-top">
                                    <div className="notepad-note-card-title">{title}</div>
                                    <div className="notepad-note-card-date">Updated {formatUpdatedAt(note.updatedAt)}</div>
                                </div>
                                <div className="notepad-note-card-preview">{preview}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeNote && (
                <div className="notepad-overlay">
                    <div className="notepad-shell">
                        <div className="notepad-toolbar">
                            <div className="notepad-toolbar-left">
                                <div className="notepad-meta-block">
                                    <input
                                        className="notepad-title-input"
                                        placeholder="Note title"
                                        value={activeNote.title}
                                        onChange={(event) => handleUpdateTitle(event.target.value)}
                                    />
                                    <p className="notepad-updated-label">Updated on {formatUpdatedAt(activeNote.updatedAt)}</p>
                                </div>
                            </div>
                            <div className="notepad-toolbar-right">
                                <Tooltip title="Close note" placement="bottom">
                                    <button
                                        type="button"
                                        className="notepad-ghost-btn notepad-icon-btn"
                                        onClick={handleCloseEditor}
                                        aria-label="Close note"
                                    >
                                        <CloseOutlined />
                                    </button>
                                </Tooltip>
                                <Tooltip title="Delete note 🗑️" placement="bottom">
                                    <button
                                        type="button"
                                        className="notepad-danger-btn notepad-icon-btn"
                                        onClick={() => handleDeleteNote(activeNote.id)}
                                        aria-label="Delete note"
                                    >
                                        <DeleteOutlined />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="notepad-toolbar-actions">
                            {toolbarButtons.map((button) => (
                                <Tooltip key={button.title} title={button.title} placement="top">
                                    <button
                                        type="button"
                                        className={`notepad-action-btn notepad-icon-btn ${button.isActive ? "is-active" : ""}`}
                                        onClick={button.onClick}
                                        disabled={!editor}
                                        aria-label={button.title}
                                    >
                                        {button.icon}
                                    </button>
                                </Tooltip>
                            ))}
                            <div className="notepad-emoji-wrap" ref={emojiWrapRef}>
                                <Tooltip title="Emoji 😀" placement="top">
                                    <button
                                        type="button"
                                        className={`notepad-action-btn notepad-icon-btn ${showEmojis ? "is-active" : ""}`}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setShowEmojis((current) => !current)}
                                        disabled={!editor}
                                        aria-label="Insert emoji"
                                    >
                                        <SmileOutlined />
                                    </button>
                                </Tooltip>
                                {showEmojis && (
                                    <div className="notepad-emoji-panel">
                                        {EMOJIS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                className="notepad-emoji-btn"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => {
                                                    editor?.chain().focus().insertContent(`${emoji} `).run();
                                                    setShowEmojis(false);
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {editor?.isActive("table") && (
                            <div className="notepad-table-actions">
                                {tableButtons.map((button) => (
                                    <Tooltip key={button.title} title={button.title} placement="top">
                                        <button
                                            type="button"
                                            className="notepad-table-btn notepad-icon-btn"
                                            onClick={button.onClick}
                                            aria-label={button.title}
                                        >
                                            {button.icon}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        )}

                        <div className="notepad-editor-wrap">
                            <EditorContent editor={editor} />
                            {activeNoteIsEmpty && <div className="notepad-placeholder">Start typing your note...</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notepad;
