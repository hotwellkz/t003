import React, { useState, useEffect } from 'react'
import '../App.css'

interface Channel {
  id: string
  name: string
  basePrompt: string
  veoPromptTemplate: string
}

const ChannelSettings: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    basePrompt: '',
    veoPromptTemplate: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка создания канала')
      }

      setFormData({ name: '', basePrompt: '', veoPromptTemplate: '' })
      setSuccess('Канал успешно создан!')
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
        <h2>Добавить канал</h2>
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
              placeholder="Например: Бабушка и Дедушка"
              required
            />
          </div>

          <div className="input-group">
            <label>Базовый промпт для генерации идей</label>
            <textarea
              value={formData.basePrompt}
              onChange={(e) =>
                setFormData({ ...formData, basePrompt: e.target.value })
              }
              placeholder="Опишите стиль и тематику канала для генерации идей..."
              required
            />
          </div>

          <div className="input-group">
            <label>Шаблон промпта для Veo 3.1 Fast</label>
            <textarea
              value={formData.veoPromptTemplate}
              onChange={(e) =>
                setFormData({ ...formData, veoPromptTemplate: e.target.value })
              }
              placeholder='Используйте {{idea}} для подстановки выбранной идеи. Например: "Создай 8-секундное видео: {{idea}}"'
              required
            />
            <small style={{ color: '#718096', marginTop: '0.5rem', display: 'block' }}>
              Используйте {'{{idea}}'} для подстановки выбранной идеи
            </small>
          </div>

          <button
            type="submit"
            className="button"
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать канал'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Список каналов</h2>
        <div className="channel-list">
          {channels.length === 0 ? (
            <p style={{ color: '#718096' }}>Каналы не найдены</p>
          ) : (
            channels.map((channel) => (
              <div key={channel.id} className="channel-item">
                <div className="channel-info">
                  <h3>{channel.name}</h3>
                  <p>
                    <strong>Базовый промпт:</strong> {channel.basePrompt}
                  </p>
                  <p>
                    <strong>Шаблон Veo:</strong> {channel.veoPromptTemplate}
                  </p>
                </div>
                <button
                  className="button button-danger"
                  onClick={() => handleDelete(channel.id)}
                  disabled={loading}
                >
                  Удалить
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ChannelSettings

