import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Pencil, Trash2, RefreshCw, X, AlertCircle, Loader2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

function emptyFormFromFields(fields) {
  return fields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {});
}

export default function ResourceTab({ config }) {
  const { fetchAdmin } = useAdmin();
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [form, setForm] = useState(() => emptyFormFromFields(config.fields));
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadItems = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const data = await fetchAdmin(config.listPath);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err.message || 'Failed to load list.');
    } finally {
      setListLoading(false);
    }
  }, [fetchAdmin, config.listPath]);

  useEffect(() => {
    setForm(emptyFormFromFields(config.fields));
    setEditingId(null);
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.listPath]);

  const handleChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const [imageError, setImageError] = useState('');

  // Converts an uploaded poster file to a base64 data URL client-side, so
  // the rest of the form/submit flow can treat it like any other string
  // field. Kept under ~5mb pre-encoding so the base64 payload (which runs
  // ~33% larger) comfortably fits the backend's 8mb JSON body limit.
  const handleImageChange = (name, file) => {
    setImageError('');
    if (!file) {
      handleChange(name, '');
      return;
    }
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      setImageError('Please choose a PNG, JPEG, WEBP or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handleChange(name, reader.result);
    reader.onerror = () => setImageError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const startEdit = (item) => {
    const next = {};
    config.fields.forEach(f => { next[f.name] = item[f.name] ?? ''; });
    setForm(next);
    setEditingId(item.id);
    setFormError('');
  };

  const cancelEdit = () => {
    setForm(emptyFormFromFields(config.fields));
    setEditingId(null);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      config.fields.forEach(f => {
        if (f.type === 'number' && payload[f.name] !== '') {
          payload[f.name] = Number(payload[f.name]);
        }
      });

      if (editingId) {
        await fetchAdmin(`${config.mutatePath}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchAdmin(config.mutatePath, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      cancelEdit();
      loadItems();
    } catch (err) {
      setFormError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete this ${config.resourceLabel.toLowerCase()}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await fetchAdmin(`${config.mutatePath}/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      window.alert(err.message || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-section-grid">
      {/* Create / Edit form */}
      <div className="admin-card">
        <h3 className="admin-form-title">
          <PlusCircle size={15} color="var(--a-gold)" />
          <span>{editingId ? `Edit ${config.resourceLabel}` : `Add New ${config.resourceLabel}`}</span>
        </h3>

        {formError && (
          <div className="admin-alert admin-alert-error">
            <AlertCircle size={13} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          {config.fields.map(f => (
            <div className="admin-form-row" key={f.name}>
              <label>{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? (
                <textarea
                  className="admin-input"
                  value={form[f.name] ?? ''}
                  placeholder={f.placeholder}
                  required={f.required}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                />
              ) : f.type === 'image' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {form[f.name] && (
                    <img
                      src={form[f.name]}
                      alt="Poster preview"
                      style={{ width: '100%', maxWidth: '220px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  )}
                  <input
                    className="admin-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    required={f.required && !form[f.name]}
                    onChange={(e) => handleImageChange(f.name, e.target.files?.[0])}
                  />
                  {form[f.name] && (
                    <button type="button" className="admin-btn-ghost" onClick={() => handleChange(f.name, '')}>
                      <X size={13} />
                      <span>Remove image</span>
                    </button>
                  )}
                  {imageError && (
                    <div className="admin-alert admin-alert-error">
                      <AlertCircle size={13} />
                      <span>{imageError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  className="admin-input"
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  value={form[f.name] ?? ''}
                  placeholder={f.placeholder}
                  required={f.required}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="admin-form-actions">
            <button type="submit" disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 size={14} className="admin-spin" /> : null}
              <span>{saving ? 'Saving...' : editingId ? 'Save Changes' : `Create ${config.resourceLabel}`}</span>
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="admin-btn-ghost">
                <X size={13} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h3 className="admin-form-title" style={{ marginBottom: 0 }}>
            <span>{config.resourceLabel}s ({items.length})</span>
          </h3>
          <button onClick={loadItems} className="admin-btn-icon" title="Refresh">
            <RefreshCw size={14} className={listLoading ? 'admin-spin' : ''} />
          </button>
        </div>

        {listError && (
          <div className="admin-alert admin-alert-error">
            <AlertCircle size={13} />
            <span>{listError}</span>
          </div>
        )}

        <div className="admin-list">
          {!listLoading && items.length === 0 && !listError && (
            <div className="admin-empty-state">No {config.resourceLabel.toLowerCase()}s yet. Create the first one.</div>
          )}
          {items.map((item) => (
            <div className="admin-list-item" key={item.id}>
              <div className="admin-list-item-top">
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  {item.posterImage && (
                    <img
                      src={item.posterImage}
                      alt=""
                      style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <p className="admin-list-item-title">{item[config.titleField]}</p>
                    {config.subtitleField && <p className="admin-list-item-meta">{item[config.subtitleField]}</p>}
                  </div>
                </div>
                <div className="admin-list-item-actions">
                  <button onClick={() => startEdit(item)} className="admin-btn-icon" title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="admin-btn-icon"
                    title="Delete"
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? <Loader2 size={13} className="admin-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
              {config.bodyField && item[config.bodyField] && (
                <p className="admin-list-item-body">{item[config.bodyField]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
