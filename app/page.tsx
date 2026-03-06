// robografts/app/page.tsx
'use client'

import { useState, useRef, useCallback } from 'react'

interface Follicle {
  id: number
  x_percent: number
  y_percent: number
  angle: number
  viable: boolean
  extract: boolean
  confidence: number
}

interface Zone {
  id: number
  label: string
  density: 'Low' | 'Medium' | 'High'
  viable: boolean
  extraction_rate: number
  notes: string
}

interface AnalysisResult {
  follicle_count: number
  viable_count: number
  extract_count: number
  leave_count: number
  viable_percentage: number
  extraction_rate: number
  image_quality: 'Good' | 'Fair' | 'Poor'
  image_quality_notes: string
  density: 'Low' | 'Medium' | 'High'
  density_score: number
  avg_angle: number
  scalp_condition: 'Healthy' | 'Fair' | 'Poor'
  recommended_action: string
  zones: Zone[]
  follicles: Follicle[]
  summary: string
  warnings: string[]
}

const densityColor = (d: string) => {
  if (d === 'High') return '#10b981'
  if (d === 'Medium') return '#f59e0b'
  return '#ef4444'
}

const conditionColor = (c: string) => {
  if (c === 'Healthy') return '#10b981'
  if (c === 'Fair') return '#f59e0b'
  return '#ef4444'
}

// Dot colours:
// Blue  = extract (selected for FUE)
// Grey  = leave in place (donor preservation)
// Red   = non-viable (damaged/weak)
const follicleColor = (f: Follicle) => {
  if (!f.viable) return { bg: 'rgba(239,68,68,0.85)', border: '#ef4444', glow: 'rgba(239,68,68,0.5)' }
  if (f.extract) return { bg: 'rgba(59,130,246,0.85)', border: '#3b82f6', glow: 'rgba(59,130,246,0.5)' }
  return { bg: 'rgba(100,116,139,0.7)', border: '#64748b', glow: 'rgba(100,116,139,0.3)' }
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<string>('image/jpeg')
  const [analysing, setAnalysing] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')
  const [hoveredFollicle, setHoveredFollicle] = useState<Follicle | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadImage = (file: File) => {
    setMediaType(file.type || 'image/jpeg')
    setResults(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setImage(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) loadImage(file)
  }, [])

  const analyse = async () => {
    if (!image) return
    setAnalysing(true)
    setError(null)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 12, 88))
    }, 400)

    try {
      const base64 = image.split(',')[1]
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType })
      })

      clearInterval(interval)
      setProgress(95)

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')

      setResults(data)
      setProgress(100)
      setActiveTab('overview')
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setProgress(0)
    } finally {
      setAnalysing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050c1a', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: '#e2e8f0' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a1628; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .upload-zone:hover { border-color: #3b82f6 !important; background: rgba(59,130,246,0.05) !important; }
        .btn-primary { transition: all 0.2s; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(59,130,246,0.4); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .tab { transition: all 0.2s; cursor: pointer; }
        .tab:hover { color: #93c5fd; }
        .follicle-dot { transition: all 0.15s; cursor: pointer; }
        .metric-card:hover { border-color: #3b82f6 !important; transform: translateY(-2px); }
        @keyframes pulse-ring { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.2); } }
        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #0e2040', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,12,26,0.95)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 2, color: '#e2e8f0' }}>ROBOGRAFTS</div>
            <div style={{ fontSize: 10, color: '#4a7aba', letterSpacing: 1, fontFamily: "'DM Mono'" }}>FOLLICLE DETECTION SYSTEM v0.1</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse-ring 2s infinite' }}></div>
          <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Mono'" }}>SYSTEM ONLINE</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: results ? '1fr 1fr' : '1fr', gap: 24 }}>

          {/* Left Panel */}
          <div>
            <div
              className="upload-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !image && fileInputRef.current?.click()}
              style={{ border: '2px dashed #1e3a5f', borderRadius: 16, background: '#0a1628', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: image ? 'default' : 'pointer', position: 'relative', overflow: 'hidden', marginBottom: 16, transition: 'all 0.2s' }}
            >
              {image ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img src={image} alt="Scalp" style={{ width: '100%', borderRadius: 14, display: 'block' }} />

                  {analysing && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)', animation: 'scan 1.5s linear infinite' }}></div>
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(59,130,246,0.06)' }}></div>
                    </div>
                  )}

                  {results?.follicles && !analysing && (
                    <div style={{ position: 'absolute', inset: 0 }}>
                      {results.follicles.map(f => {
                        const colors = follicleColor(f)
                        const isHovered = hoveredFollicle?.id === f.id
                        return (
                          <div
                            key={f.id}
                            className="follicle-dot"
                            onMouseEnter={() => setHoveredFollicle(f)}
                            onMouseLeave={() => setHoveredFollicle(null)}
                            style={{
                              position: 'absolute',
                              left: `${f.x_percent}%`,
                              top: `${f.y_percent}%`,
                              transform: 'translate(-50%, -50%)',
                              width: isHovered ? 16 : 10,
                              height: isHovered ? 16 : 10,
                              borderRadius: '50%',
                              background: colors.bg,
                              border: `1.5px solid ${colors.border}`,
                              boxShadow: `0 0 8px ${colors.glow}`,
                              zIndex: 10,
                              transition: 'all 0.15s'
                            }}
                          />
                        )
                      })}

                      {hoveredFollicle && (
                        <div style={{ position: 'absolute', left: `${Math.min(hoveredFollicle.x_percent, 65)}%`, top: `${Math.max(hoveredFollicle.y_percent - 14, 2)}%`, background: 'rgba(5,12,26,0.95)', border: '1px solid #1e3a5f', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: "'DM Mono'", zIndex: 20, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                          <div style={{ color: !hoveredFollicle.viable ? '#ef4444' : hoveredFollicle.extract ? '#3b82f6' : '#64748b' }}>
                            #{hoveredFollicle.id} — {!hoveredFollicle.viable ? 'NON-VIABLE' : hoveredFollicle.extract ? 'EXTRACT' : 'LEAVE IN PLACE'}
                          </div>
                          <div style={{ color: '#64748b' }}>Angle: {hoveredFollicle.angle}° | Conf: {hoveredFollicle.confidence}%</div>
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(5,12,26,0.8)', border: '1px solid #1e3a5f', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono'" }}>
                    CHANGE
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔬</div>
                  <div style={{ fontSize: 16, color: '#4a7aba', marginBottom: 8 }}>Drop scalp image here</div>
                  <div style={{ fontSize: 12, color: '#2d4a6e', fontFamily: "'DM Mono'" }}>PNG, JPG, WEBP — dermoscopy or photo</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && loadImage(e.target.files[0])} />
            </div>

            {analysing && (
              <div style={{ height: 3, background: '#0e2040', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #1e40af, #3b82f6)', borderRadius: 2, transition: 'width 0.4s ease' }}></div>
              </div>
            )}

            {/* Legend */}
            {results && !analysing && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10,
                  background: results.image_quality === 'Good' ? 'rgba(16,185,129,0.1)' : results.image_quality === 'Fair' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${results.image_quality === 'Good' ? 'rgba(16,185,129,0.3)' : results.image_quality === 'Fair' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 6, padding: '4px 10px'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: results.image_quality === 'Good' ? '#10b981' : results.image_quality === 'Fair' ? '#f59e0b' : '#ef4444' }}></div>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono'", color: results.image_quality === 'Good' ? '#10b981' : results.image_quality === 'Fair' ? '#f59e0b' : '#ef4444' }}>
                    IMAGE QUALITY: {results.image_quality?.toUpperCase()} — {results.image_quality === 'Good' ? '75%+ confidence threshold applied' : results.image_quality_notes}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: "'DM Mono'", flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }}></div>
                    <span style={{ color: '#64748b' }}>EXTRACT ({results.extract_count})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b' }}></div>
                    <span style={{ color: '#64748b' }}>LEAVE ({results.leave_count})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
                    <span style={{ color: '#64748b' }}>NON-VIABLE ({results.follicles?.filter(f => !f.viable).length})</span>
                  </div>
                </div>
              </div>
            )}

            <button className="btn-primary" onClick={analyse} disabled={!image || analysing} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1e40af, #3b82f6)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontFamily: "'Bebas Neue'", letterSpacing: 3 }}>
              {analysing ? `ANALYSING... ${Math.round(progress)}%` : 'RUN FOLLICLE DETECTION'}
            </button>

            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 12, color: '#f87171', fontFamily: "'DM Mono'" }}>⚠ {error}</div>
            )}
          </div>

          {/* Right Panel */}
          {results && !analysing && (
            <div className="fade-in">
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #0e2040' }}>
                {['overview', 'zones', 'follicles'].map(tab => (
                  <button key={tab} className="tab" onClick={() => setActiveTab(tab)} style={{ background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent', padding: '8px 16px', color: activeTab === tab ? '#93c5fd' : '#4a7aba', fontSize: 11, fontFamily: "'DM Mono'", letterSpacing: 1, textTransform: 'uppercase', marginBottom: -1, cursor: 'pointer' }}>
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div>
                  {/* Key metrics — 4 cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    {[
                      { label: 'DETECTED', value: results.follicle_count, unit: 'total follicles', color: '#e2e8f0' },
                      { label: 'FOR EXTRACTION', value: results.extract_count, unit: `${results.extraction_rate}% of donor area`, color: '#3b82f6' },
                      { label: 'LEAVE IN PLACE', value: results.leave_count, unit: 'donor preservation', color: '#64748b' },
                      { label: 'VIABLE GRAFTS', value: `${results.viable_percentage}%`, unit: `${results.viable_count} healthy follicles`, color: '#10b981' },
                    ].map(m => (
                      <div key={m.label} className="metric-card" style={{ background: '#0a1628', border: '1px solid #0e2040', borderRadius: 10, padding: '14px 12px', transition: 'all 0.2s' }}>
                        <div style={{ fontSize: 9, color: '#4a7aba', fontFamily: "'DM Mono'", letterSpacing: 1, marginBottom: 6 }}>{m.label}</div>
                        <div style={{ fontSize: 26, fontFamily: "'Bebas Neue'", color: m.color, letterSpacing: 1, lineHeight: 1 }}>{m.value}</div>
                        <div style={{ fontSize: 10, color: '#2d4a6e', fontFamily: "'DM Mono'", marginTop: 4 }}>{m.unit}</div>
                      </div>
                    ))}
                  </div>

                  {/* Extraction rate warning bar */}
                  <div style={{ background: '#0a1628', border: `1px solid ${results.extraction_rate > 50 ? '#ef4444' : '#0e2040'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: '#4a7aba', fontFamily: "'DM Mono'", letterSpacing: 1 }}>DONOR EXTRACTION RATE</span>
                      <span style={{ fontSize: 10, color: results.extraction_rate > 50 ? '#ef4444' : '#10b981', fontFamily: "'DM Mono'" }}>{results.extraction_rate}% {results.extraction_rate > 50 ? '⚠ EXCEEDS SAFE LIMIT' : '✓ WITHIN SAFE LIMIT'}</span>
                    </div>
                    <div style={{ height: 6, background: '#0e2040', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(results.extraction_rate * 2, 100)}%`, background: results.extraction_rate > 50 ? '#ef4444' : '#10b981', borderRadius: 3, transition: 'width 0.4s ease' }}></div>
                    </div>
                    <div style={{ fontSize: 10, color: '#2d4a6e', fontFamily: "'DM Mono'", marginTop: 4 }}>Safe FUE limit: 50% of donor follicles per session</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div style={{ background: '#0a1628', border: '1px solid #0e2040', borderRadius: 10, padding: '14px 12px' }}>
                      <div style={{ fontSize: 9, color: '#4a7aba', fontFamily: "'DM Mono'", letterSpacing: 1, marginBottom: 8 }}>DENSITY</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: densityColor(results.density) }}></div>
                        <span style={{ fontSize: 16, fontFamily: "'Bebas Neue'", color: densityColor(results.density), letterSpacing: 1 }}>{results.density}</span>
                      </div>
                      <div style={{ height: 4, background: '#0e2040', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${results.density_score}%`, background: densityColor(results.density), borderRadius: 2 }}></div>
                      </div>
                      <div style={{ fontSize: 10, color: '#2d4a6e', fontFamily: "'DM Mono'", marginTop: 4 }}>{results.density_score}/100</div>
                    </div>
                    <div style={{ background: '#0a1628', border: '1px solid #0e2040', borderRadius: 10, padding: '14px 12px' }}>
                      <div style={{ fontSize: 9, color: '#4a7aba', fontFamily: "'DM Mono'", letterSpacing: 1, marginBottom: 8 }}>SCALP CONDITION</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: conditionColor(results.scalp_condition) }}></div>
                        <span style={{ fontSize: 16, fontFamily: "'Bebas Neue'", color: conditionColor(results.scalp_condition), letterSpacing: 1 }}>{results.scalp_condition}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#2d4a6e', fontFamily: "'DM Mono'" }}>Avg angle: {results.avg_angle}°</div>
                    </div>
                  </div>

                  <div style={{ background: '#0a1628', border: '1px solid #0e2040', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#4a7aba', fontFamily: "'DM Mono'", letterSpacing: 1, marginBottom: 8 }}>CLINICAL SUMMARY</div>
                    <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{results.summary}</p>
                  </div>

                  <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#3b82f6', fontFamily: "'DM Mono'", letterSpacing: 1, marginBottom: 6 }}>RECOMMENDED ACTION</div>
                    <p style={{ fontSize: 13, color: '#93c5fd' }}>{results.recommended_action}</p>
                  </div>

                  {results.warnings?.length > 0 && (
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 9, color: '#f59e0b', fontFamily: "'DM Mono'", letterSpacing: 1, marginBottom: 8 }}>⚠ WARNINGS</div>
                      {results.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: '#fbbf24', marginBottom: 4 }}>• {w}</div>)}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'zones' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.zones?.map(z => (
                    <div key={z.id} style={{ background: '#0a1628', border: '1px solid #0e2040', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{z.label}</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 10, fontFamily: "'DM Mono'", color: densityColor(z.density), background: `${densityColor(z.density)}20`, padding: '2px 8px', borderRadius: 4 }}>{z.density}</span>
                          <span style={{ fontSize: 10, fontFamily: "'DM Mono'", color: '#3b82f6', background: '#3b82f620', padding: '2px 8px', borderRadius: 4 }}>{z.extraction_rate}% EXTRACT</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b' }}>{z.notes}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'follicles' && (
                <div>
                  <div style={{ fontSize: 11, color: '#4a7aba', fontFamily: "'DM Mono'", marginBottom: 12 }}>
                    {results.follicle_count} DETECTED — {results.extract_count} FOR EXTRACTION — HOVER IMAGE TO INSPECT
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
                    {results.follicles?.map(f => {
                      const colors = follicleColor(f)
                      return (
                        <div key={f.id} onMouseEnter={() => setHoveredFollicle(f)} onMouseLeave={() => setHoveredFollicle(null)}
                          style={{ background: hoveredFollicle?.id === f.id ? `${colors.border}15` : '#0a1628', border: `1px solid ${hoveredFollicle?.id === f.id ? colors.border : '#0e2040'}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: "'DM Mono'", color: '#64748b' }}>#{f.id}</span>
                            <span style={{ fontSize: 10, color: colors.border, fontFamily: "'DM Mono'" }}>
                              {!f.viable ? '✗ NON-VIABLE' : f.extract ? '↑ EXTRACT' : '○ LEAVE'}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#4a7aba', fontFamily: "'DM Mono'" }}>{f.angle}° | {f.confidence}% conf</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #0a1628', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#1e3a5f', fontFamily: "'DM Mono'" }}>ROBOGRAFTS © 2026 — WALK IN. WALK OUT. TRANSFORMED.</span>
          <span style={{ fontSize: 10, color: '#1e3a5f', fontFamily: "'DM Mono'" }}>FDS v0.1 — RESEARCH USE ONLY</span>
        </div>
      </div>
    </div>
  )
}
