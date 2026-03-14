'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Upload, Trash2, Image } from 'lucide-react'

export default function PhotosPage() {
  const [photos, setPhotos] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const load = () => fetch('/api/photos').then(r => r.json()).then(setPhotos).catch(() => {})
  useEffect(() => { load() }, [])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/photos', { method: 'POST', body: fd })
        if (!res.ok) throw new Error()
      }
      toast.success(`${files.length} photo(s) uploaded! ✅`)
      load()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }

  const del = async (filename: string) => {
    await fetch(`/api/photos?file=${encodeURIComponent(filename)}`, { method: 'DELETE' })
    toast.success('Deleted')
    load()
  }

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Photo Library</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Photos are picked randomly for each auto-post</p>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 24 }}>
        <Upload size={15} />{uploading ? 'Uploading...' : 'Upload Photos'}
        <input type="file" accept="image/*" multiple onChange={upload} style={{ display: 'none' }} />
      </label>

      {!photos.length ? (
        <div className="glass" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <Image size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No photos yet. Upload some to use in your posts.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {photos.map((p: any) => (
            <div key={p.filename} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--surface2)', aspectRatio: '1' }}>
              <img src={`/api/proxy-image?url=${encodeURIComponent(`/uploads/${p.filename}`)}`} alt={p.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => del(p.filename)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white', padding: 4, display: 'flex' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
