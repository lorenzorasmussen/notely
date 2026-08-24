import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotesStore } from '../store/notesStore';
import { formatDistanceToNow } from 'date-fns';

export default function Notes() {
  const navigate = useNavigate();
  const { notes, activeNoteId, setActiveNote, fetchNotes, isLoading } = useNotesStore();

  useEffect(() => {
    fetchNotes();
  }, []);

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h2 className="page-title">All Notes</h2>
        <span className="notes-count">{notes.length} notes</span>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading notes...</p>
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">\ud83d\udcdd</div>
          <h3>No notes yet</h3>
          <p>Create your first note to get started</p>
          <button className="btn btn-primary" onClick={() => navigate('/new')}>
            Create Note
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`note-card card ${activeNoteId === note.id ? 'active' : ''}`}
              onClick={() => {
                setActiveNote(note.id);
                navigate(`/note/${note.id}`);
              }}
            >
              <div className="note-card-header">
                {note.pinned && <span className="pin-badge">\ud83d\udccc Pinned</span>}
                <span className="note-date">
                  {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                </span>
              </div>
              <h3 className="note-card-title">{note.title || 'Untitled'}</h3>
              <p className="note-card-snippet">
                {note.content.slice(0, 150) || 'No content'}
              </p>
              <div className="note-card-tags">
                {note.tags.map((tag) => (
                  <span key={tag.id} className="tag-badge">
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
