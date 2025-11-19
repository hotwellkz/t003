import React, { useState, useEffect } from 'react'
import '../App.css'

type Language = 'ru' | 'kk' | 'en'

interface Channel {
  id: string
  name: string
  description: string
  language: Language
  durationSeconds: number
  ideaPromptTemplate: string
  videoPromptTemplate: string
}

const ChannelSettings: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: 'ru' as Language,
    durationSeconds: 8,
    ideaPromptTemplate: '',
    videoPromptTemplate: '',
  })

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels')
      if (!response.ok) throw new Error('Ошибка загрузки каналов')
      const data = await response.json()
      setChannels(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      language: 'ru',
      durationSeconds: 8,
      ideaPromptTemplate: '',
      videoPromptTemplate: '',
    })
    setEditingId(null)
  }

  const handleEdit = (channel: Channel) => {
    setFormData({
      name: channel.name,
      description: channel.description,
      language: channel.language,
      durationSeconds: channel.durationSeconds,
      ideaPromptTemplate: channel.ideaPromptTemplate,
      videoPromptTemplate: channel.videoPromptTemplate,
    })
    setEditingId(channel.id)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const url = editingId ? `/api/channels/${editingId}` : '/api/channels'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка сохранения канала')
      }

      resetForm()
      setSuccess(editingId ? 'Канал успешно обновлён!' : 'Канал успешно создан!')
      fetchChannels()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот канал?')) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/channels/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Ошибка удаления канала')

      setSuccess('Канал успешно удалён!')
      fetchChannels()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="card">
        <h2>{editingId ? 'Редактировать канал' : 'Добавить канал'}</h2>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Название канала</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Например: Бабушка и Дедушка Life"
              required
            />
          </div>

          <div className="input-group">
            <label>Описание стиля</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Краткое описание стиля канала"
            />
          </div>

          <div className="input-group">
            <label>Основной язык</label>
            <select
              value={formData.language}
              onChange={(e) =>
                setFormData({ ...formData, language: e.target.value as Language })
              }
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="input-group">
            <label>Длительность (сек)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={formData.durationSeconds}
              onChange={(e) =>
                setFormData({ ...formData, durationSeconds: parseInt(e.target.value) || 8 })
              }
              required
            />
          </div>

          <div className="input-group">
            <label>Промпт для генерации идей</label>
            <textarea
              value={formData.ideaPromptTemplate}
              onChange={(e) =>
                setFormData({ ...formData, ideaPromptTemplate: e.target.value })
              }
              placeholder="Сгенерируй 5 идей для очень смешных 8-секундных видео..."
              rows={6}
              required
            />
            <small style={{ color: '#718096', marginTop: '0.5rem', display: 'block' }}>
              Этот промпт будет использоваться для генерации идей через OpenAI. 
              Можете использовать плейсхолдеры: {'{{DURATION}}'}, {'{{LANGUAGE}}'}, {'{{DESCRIPTION}}'}
            </small>
          </div>

          <div className="input-group">
            <label>Промпт для генерации Veo-промпта + названия</label>
            <textarea
              value={formData.videoPromptTemplate}
              onChange={(e) =>
                setFormData({ ...formData, videoPromptTemplate: e.target.value })
              }
              placeholder='На основе следующей идеи сгенерируй детализированный промпт для Veo 3.1 Fast...'
              rows={8}
              required
            />
            <small style={{ color: '#718096', marginTop: '0.5rem', display: 'block' }}>
              Используйте {'{{IDEA_TEXT}}'} для подстановки выбранной идеи. 
              OpenAI должен вернуть JSON с полями veo_prompt и video_title.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              className="button"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать канал'}
            </button>
            {editingId && (
              <button
                type="button"
                className="button"
                onClick={resetForm}
                disabled={loading}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Список каналов</h2>
        <div className="channel-list">
          {channels.length === 0 ? (
            <p style={{ color: '#718096' }}>Каналы не найдены</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Имя</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Язык</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Длительность</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={channel.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{channel.name}</strong>
                      {channel.description && (
                        <div style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.25rem' }}>
                          {channel.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{channel.language.toUpperCase()}</td>
                    <td style={{ padding: '0.75rem' }}>{channel.durationSeconds}с</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="button"
                          onClick={() => handleEdit(channel)}
                          disabled={loading}
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        >
                          Редактировать
                        </button>
                        <button
                          className="button button-danger"
                          onClick={() => handleDelete(channel.id)}
                          disabled={loading}
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChannelSettings
