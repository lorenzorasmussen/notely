import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotesStore, Note } from '../store/notesStore';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default function NoteEditor() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    setActiveNote,
    fetchNotes,
    fetchTags,
    tags,
  } = useNotesStore();

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchNotes();
    fetchTags();
  }, []);

  useEffect(() => {
    if (noteId) {
      const found = notes.find((n) => n.id === noteId);
      if (found) {
        setNote(found);
        setTitle(found.title);
        setContent(found.content);
        setSelectedTags(found.tags.map((t) => t.name));
        setIsPinned(found.pinned);
        setActiveNote(found.id);
      }
    } else {
      createNote().then((newNote) => {
        setNote(newNote);
        setActiveNote(newNote.id);
      });
    }
  }, [noteId, notes]);

  useEffect(() => {
    if (!note) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (
        title !== note.title ||
        content !== note.content ||
        isPinned !== note.pinned
      ) {
        setIsSaving(true);
        try {
          await updateNote(note.id, {
            title,
            content,
            pinned: isPinned,
          });
        } finally {
          setIsSaving(false);
        }
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, isPinned, note]);

  const handleDelete = async () => {
    if (!note) return;
    await deleteNote(note.id);
    navigate('/');
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const sanitizedContent = DOMPurify.sanitize(marked(content) as string);

  if (!note) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading note...</p>
      </div>
    );
  }

  return (
    <div className="note-editor">
      <div className="editor-toolbar">
        <button
          className={`btn ${isPinned ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setIsPinned(!isPinned)}
        >
          \ud83d\udccc {isPinned ? 'Pinned' : 'Pin'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? '\u270f\ufe0f Edit' : '\ud83d\udc41 Preview'}
        </button>
        {isSaving && <span className="saving-indicator">Saving...</span>}
        <div className="toolbar-spacer"></div>
        <button
          className="btn btn-danger"
          onClick={() => setShowDeleteConfirm(true)}
        >
          \ud83d\uddd1 Delete
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal card">
            <h3>Delete Note</h3>
            <p>Are you sure you want to delete "{title || 'Untitled'}"? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="editor-fields">
        <input
          type="text"
          className="input note-title-input"
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="tags-input-container">
          <span className="tags-label">Tags:</span>
          <div className="tags-selector">
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`tag-chip ${selectedTags.includes(tag.name) ? 'active' : ''}`}
                onClick={() => toggleTag(tag.name)}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {previewMode ? (
        <div
          className="markdown-preview card"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      ) : (
        <textarea
          className="note-content-input card"
          placeholder="Start writing... (Markdown supported)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      )}

      <div className="editor-footer">
        <span className="word-count">
          {content.trim() ? content.trim().split(/\s+/).length : 0} words \u00b7 {content.length}{' '}
          characters
        </span>
        <span className="last-edited">
          Last edited {new Date(note.updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
