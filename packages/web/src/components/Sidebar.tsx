import { Link, useLocation } from 'react-router-dom';
import { useNotesStore } from '../store/notesStore';

export default function Sidebar() {
  const location = useLocation();
  const { notes, tags, activeTag, setActiveTag, searchQuery, setSearchQuery } = useNotesStore();

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !activeTag || note.tags.some((t) => t.name === activeTag);

    return matchesSearch && matchesTag;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <input
          type="text"
          className="input"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">Tags</h3>
        <div className="tag-filters">
          <button
            className={`tag-chip ${!activeTag ? 'active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-chip ${activeTag === tag.name ? 'active' : ''}`}
              onClick={() => setActiveTag(tag.name)}
            >
              #{tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">
          Notes ({filteredNotes.length})
        </h3>
        <div className="notes-list">
          {filteredNotes.length === 0 ? (
            <p className="no-notes">No notes found</p>
          ) : (
            filteredNotes.map((note) => (
              <Link
                key={note.id}
                to={`/note/${note.id}`}
                className={`note-item ${location.pathname === `/note/${note.id}` ? 'active' : ''}`}
              >
                <div className="note-item-header">
                  {note.pinned && <span className="pin-icon">\ud83d\udccc</span>}
                  <span className="note-item-title">{note.title || 'Untitled'}</span>
                </div>
                <div className="note-item-snippet">
                  {note.content.slice(0, 80) || 'No content'}
                </div>
                <div className="note-item-meta">
                  {note.tags.map((t) => (
                    <span key={t.id} className="note-tag">
                      #{t.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
