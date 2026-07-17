import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi, type AdminTelegramGroup } from '../../lib/adminApi'
import { EmptyState, LoadingState, PageHeader, StatusBadge } from './components/ui'

const EMOJIS = ['❤️', '🔥', '✨', '🎉', '💚', '👋', '🙏', '😍', '💯', '🚀', '⭐', '💬']

export function AdminBroadcastPage() {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [groups, setGroups] = useState<AdminTelegramGroup[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [withAppButton, setWithAppButton] = useState(true)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [targetChatId, setTargetChatId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.telegramGroups()
      setGroups(res.data)
      setActiveCount(res.meta.active)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus()
    document.execCommand('insertText', false, emoji)
  }

  function insertLink() {
    const url = window.prompt('Link URL (https://…)')
    if (!url) return
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    exec('createLink', href)
  }

  function onPickImage(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function editorHtml() {
    return (editorRef.current?.innerHTML || '').trim()
  }

  function editorIsEmpty() {
    const el = editorRef.current
    if (!el) return true
    return !el.textContent?.trim() && !el.querySelector('img')
  }

  async function send(chatIds?: number[]) {
    setSending(true)
    setStatus('')
    setError('')
    try {
      if (editorIsEmpty() && !image) {
        throw new Error('Add a message or an image')
      }
      const res = await adminApi.telegramBroadcast({
        messageHtml: editorHtml(),
        withAppButton,
        chatIds,
        image,
      })
      setStatus(`Queued for ${res.count} group(s)${res.has_photo ? ' with image' : ''}.`)
      if (editorRef.current) editorRef.current.innerHTML = ''
      onPickImage(null)
      if (fileRef.current) fileRef.current.value = ''
      setTargetChatId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broadcast failed')
    } finally {
      setSending(false)
    }
  }

  async function toggleActive(row: AdminTelegramGroup) {
    setBusyId(row.id)
    setError('')
    try {
      await adminApi.updateTelegramGroup(row.id, !row.is_active)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update group')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = groups.filter((g) => {
    if (filter === 'active') return g.is_active
    if (filter === 'inactive') return !g.is_active
    return true
  })

  return (
    <div className="admin-page">
      <PageHeader
        title="Broadcast"
        subtitle={`Send announcements to Telegram groups where the bot is a member. ${activeCount} active.`}
        actions={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="admin-select"
          >
            <option value="all">All groups</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive</option>
          </select>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}
      {status ? <p className="admin-success">{status}</p> : null}

      <div className="admin-card admin-broadcast-composer">
        <div className="admin-broadcast-toolbar" role="toolbar" aria-label="Formatting">
          <button type="button" className="admin-tool-btn" onClick={() => exec('bold')} title="Bold">
            <strong>B</strong>
          </button>
          <button type="button" className="admin-tool-btn" onClick={() => exec('italic')} title="Italic">
            <em>I</em>
          </button>
          <button type="button" className="admin-tool-btn" onClick={() => exec('underline')} title="Underline">
            <span style={{ textDecoration: 'underline' }}>U</span>
          </button>
          <button type="button" className="admin-tool-btn" onClick={() => exec('strikeThrough')} title="Strike">
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </button>
          <button type="button" className="admin-tool-btn" onClick={insertLink} title="Insert link">
            Link
          </button>
          <button
            type="button"
            className="admin-tool-btn"
            onClick={() => fileRef.current?.click()}
            title="Attach image"
          >
            Image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            hidden
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
          />
        </div>

        <div
          ref={editorRef}
          className="admin-broadcast-editor"
          contentEditable
          role="textbox"
          aria-multiline
          aria-label="Broadcast message"
          data-placeholder="Write your announcement… Use emoji below or Win + ."
          onInput={() => {
            /* keep uncontrolled for caret stability */
          }}
        />

        <div className="admin-emoji-row" aria-label="Emoji">
          {EMOJIS.map((e) => (
            <button key={e} type="button" className="admin-emoji-btn" onClick={() => insertEmoji(e)}>
              {e}
            </button>
          ))}
        </div>

        {imagePreview ? (
          <div className="admin-broadcast-image">
            <img src={imagePreview} alt="Attachment preview" />
            <button type="button" className="admin-btn-ghost" onClick={() => onPickImage(null)}>
              Remove image
            </button>
          </div>
        ) : null}

        <label className="admin-broadcast-toggle">
          <input
            type="checkbox"
            checked={withAppButton}
            onChange={(e) => setWithAppButton(e.target.checked)}
          />
          Attach “Open Mingle 251” button
        </label>

        <div className="admin-row-actions">
          <button
            type="button"
            className="admin-btn-lime"
            disabled={sending || activeCount === 0}
            onClick={() => void send()}
          >
            {sending && targetChatId === null ? 'Queuing…' : `Send to all active (${activeCount})`}
          </button>
          {targetChatId !== null ? (
            <button
              type="button"
              className="admin-btn-dark"
              disabled={sending}
              onClick={() => void send([targetChatId])}
            >
              {sending ? 'Queuing…' : 'Send to selected group'}
            </button>
          ) : null}
        </div>
        <p className="admin-muted" style={{ marginTop: '0.75rem' }}>
          Re-add the bot to a group if it’s missing from the list. Broadcasts are queued and rate-limited.
        </p>
      </div>

      <div className="admin-card admin-table-wrap">
        {loading ? <LoadingState /> : null}
        {!loading && filtered.length === 0 ? (
          <EmptyState
            title="No groups yet"
            subtitle="Add the bot to a Telegram group (or remove + re-add it) so we can store the chat id."
          />
        ) : null}
        {!loading && filtered.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Chat ID</th>
                <th>Type</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className={targetChatId === row.chat_id ? 'is-selected' : undefined}
                >
                  <td>
                    <strong>{row.title || 'Untitled'}</strong>
                    {row.username ? <div className="admin-muted">@{row.username}</div> : null}
                  </td>
                  <td>
                    <code>{row.chat_id}</code>
                  </td>
                  <td>{row.type}</td>
                  <td>
                    <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td>
                    <div className="admin-row-actions" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="admin-btn-ghost"
                        onClick={() =>
                          setTargetChatId((prev) => (prev === row.chat_id ? null : row.chat_id))
                        }
                      >
                        {targetChatId === row.chat_id ? 'Unselect' : 'Select'}
                      </button>
                      <button
                        type="button"
                        className={row.is_active ? 'admin-btn-dark' : 'admin-btn-lime'}
                        disabled={busyId === row.id}
                        onClick={() => void toggleActive(row)}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
