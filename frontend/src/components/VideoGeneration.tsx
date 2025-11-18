import React, { useState, useEffect } from 'react'
import '../App.css'

interface Channel {
  id: string
  name: string
  basePrompt: string
  veoPromptTemplate: string
}

interface Idea {
  id: string
  text: string
}

type Step = 1 | 2 | 3

const VideoGeneration: React.FC = () => {
  const [step, setStep] = useState<Step>(1)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null)
  const [veoPrompt, setVeoPrompt] = useState<string>('')
  const [jobId, setJobId] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [driveLinks, setDriveLinks] = useState<{
    webViewLink?: string
    webContentLink?: string
  }>({})

  // Загружаем каналы при монтировании
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

  const handleGenerateIdeas = async () => {
    if (!selectedChannelId) {
      setError('Выберите канал')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: selectedChannelId }),
      })

      if (!response.ok) throw new Error('Ошибка генерации идей')
      const data = await response.json()
      setIdeas(data.ideas)
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectIdea = async (idea: Idea) => {
    setSelectedIdea(idea)
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/prompts/veo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannelId,
          ideaText: idea.text,
        }),
      })

      if (!response.ok) throw new Error('Ошибка генерации промпта')
      const data = await response.json()
      setVeoPrompt(data.prompt)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!veoPrompt.trim()) {
      setError('Введите промпт для генерации видео')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setPreviewUrl('')
    setDriveLinks({})

    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veoprompt: veoPrompt,
          channelId: selectedChannelId,
          ideaText: selectedIdea?.text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка генерации видео')
      }

      const data = await response.json()
      setJobId(data.jobId)
      setPreviewUrl(data.previewUrl)
      setStatus(data.status)
      setSuccess('Видео успешно сгенерировано!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!jobId) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/video/jobs/${jobId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки в Google Drive')
      }

      const data = await response.json()
      setStatus(data.status)
      setDriveLinks({
        webViewLink: data.googleDriveWebViewLink,
        webContentLink: data.googleDriveWebContentLink,
      })
      setSuccess('Видео успешно загружено в Google Drive!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!jobId) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/video/jobs/${jobId}/reject`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Ошибка отклонения видео')

      setPreviewUrl('')
      setJobId('')
      setStatus('')
      setSuccess('Видео отклонено')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!jobId) return

    setLoading(true)
    setError('')
    setSuccess('')
    setPreviewUrl('')
    setDriveLinks({})

    try {
      const response = await fetch(`/api/video/jobs/${jobId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ veoprompt: veoPrompt }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка перегенерации видео')
      }

      const data = await response.json()
      setJobId(data.jobId)
      setPreviewUrl(data.previewUrl)
      setStatus(data.status)
      setSuccess('Видео перегенерировано!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep(1)
    setSelectedChannelId('')
    setIdeas([])
    setSelectedIdea(null)
    setVeoPrompt('')
    setJobId('')
    setPreviewUrl('')
    setStatus('')
    setDriveLinks({})
    setError('')
    setSuccess('')
  }

  return (
    <div className="card">
      <h2>Генерация видео</h2>

      {/* Индикатор шагов */}
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <span>Выбор канала</span>
        </div>
        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <span>Генерация идей</span>
        </div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>Генерация видео</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Шаг 1: Выбор канала */}
      {step === 1 && (
        <div>
          <div className="input-group">
            <label>Выберите канал</label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
            >
              <option value="">-- Выберите канал --</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="button"
            onClick={handleGenerateIdeas}
            disabled={!selectedChannelId || loading}
          >
            {loading ? 'Загрузка...' : 'Далее →'}
          </button>
        </div>
      )}

      {/* Шаг 2: Генерация идей */}
      {step === 2 && (
        <div>
          <button
            className="button button-secondary"
            onClick={() => setStep(1)}
            style={{ marginBottom: '1rem' }}
          >
            ← Назад
          </button>
          <button
            className="button"
            onClick={handleGenerateIdeas}
            disabled={loading}
          >
            {loading ? 'Генерация идей...' : 'Сгенерировать идеи'}
          </button>

          {ideas.length > 0 && (
            <div className="idea-list">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className={`idea-card ${selectedIdea?.id === idea.id ? 'selected' : ''}`}
                  onClick={() => handleSelectIdea(idea)}
                >
                  {idea.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Шаг 3: Промпт и генерация видео */}
      {step === 3 && (
        <div>
          <button
            className="button button-secondary"
            onClick={() => setStep(2)}
            style={{ marginBottom: '1rem' }}
          >
            ← Назад
          </button>

          <div className="input-group">
            <label>Промпт для Veo 3.1 Fast (можно редактировать)</label>
            <textarea
              value={veoPrompt}
              onChange={(e) => setVeoPrompt(e.target.value)}
              placeholder="Введите промпт для генерации видео..."
            />
          </div>

          <button
            className="button"
            onClick={handleGenerateVideo}
            disabled={loading || !veoPrompt.trim()}
          >
            {loading ? 'Генерация видео...' : 'Сгенерировать видео'}
          </button>

          {/* Превью видео */}
          {previewUrl && (
            <div style={{ marginTop: '2rem' }}>
              <h3>Превью видео</h3>
              <video src={previewUrl} controls className="video-preview" />
              <div className="video-actions">
                <button
                  className="button button-success"
                  onClick={handleApprove}
                  disabled={loading || status === 'uploaded'}
                >
                  ✅ Одобрить и отправить в Google Drive
                </button>
                <button
                  className="button button-secondary"
                  onClick={handleRegenerate}
                  disabled={loading}
                >
                  🔁 Перегенерировать
                </button>
                <button
                  className="button button-danger"
                  onClick={handleReject}
                  disabled={loading}
                >
                  🗑 Отклонить
                </button>
              </div>

              {driveLinks.webViewLink && (
                <div style={{ marginTop: '1rem' }}>
                  <a
                    href={driveLinks.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#667eea', textDecoration: 'underline' }}
                  >
                    Открыть в Google Drive
                  </a>
                </div>
              )}

              {status === 'uploaded' && (
                <div className="success" style={{ marginTop: '1rem' }}>
                  Видео успешно загружено в Google Drive!
                </div>
              )}
            </div>
          )}

          {(status === 'uploaded' || status === 'rejected') && (
            <button
              className="button"
              onClick={resetFlow}
              style={{ marginTop: '1rem' }}
            >
              Начать заново
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default VideoGeneration

