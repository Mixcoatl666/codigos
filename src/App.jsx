import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import {
  ArrowDownToLine, ArrowRight, Barcode, Check, ChevronDown, Clock3,
  Copy, FileText, History, QrCode, Search, Sparkles, Trash2, X,
} from 'lucide-react'

const STORAGE_KEY = 'clave-codes-v1'
const STARTER = 'TEXTOBAR001'

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function App() {
  const [records, setRecords] = useState(readSaved)
  const [value, setValue] = useState(STARTER)
  const [selectedId, setSelectedId] = useState(() => readSaved()[0]?.id || null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Todos')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [expandedCode, setExpandedCode] = useState(null)
  const [barcodeImage, setBarcodeImage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const barcodeRef = useRef(null)

  const selected = useMemo(() => records.find((item) => item.id === selectedId) || null, [records, selectedId])
  const filtered = useMemo(() => records.filter((item) => {
    const matchesQuery = item.text.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'Todos' || (activeTab === 'Hoy' && new Date(item.createdAt).toDateString() === new Date().toDateString())
    return matchesQuery && matchesTab
  }), [records, search, activeTab])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) }, [records])

  useEffect(() => {
    let cancelled = false
    async function renderCodes() {
      if (!selected) { setQrImage(''); setBarcodeImage(''); return }
      try {
        const qr = await QRCode.toDataURL(selected.text, { width: 1024, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#183c30', light: '#ffffff' } })
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svg, selected.text, { format: 'CODE128', displayValue: false, margin: 0, height: 76, width: 2, background: '#ffffff', lineColor: '#183c30' })
        if (!cancelled) { setQrImage(qr); setBarcodeImage(new XMLSerializer().serializeToString(svg)) }
      } catch {
        if (!cancelled) { setQrImage(''); setBarcodeImage(''); setError('No se pudo generar el código. Prueba con otro texto.') }
      }
    }
    renderCodes()
    return () => { cancelled = true }
  }, [selected])

  function generate(event) {
    event?.preventDefault()
    const clean = value.trim()
    if (!clean) { setError('Escribe un texto para crear tus códigos.'); return }
    if (clean.length > 180) { setError('Usa un texto de hasta 180 caracteres.'); return }
    setError('')
    const existing = records.find((item) => item.text.toLowerCase() === clean.toLowerCase())
    if (existing) { setSelectedId(existing.id); setExpandedCode('qr'); return }
    const item = { id: makeId(), text: clean, createdAt: new Date().toISOString() }
    setRecords((current) => [item, ...current])
    setSelectedId(item.id)
    setExpandedCode('qr')
  }

  function selectRecord(id) {
    setSelectedId(id)
    setExpandedCode('qr')
  }

  async function copyText() {
    if (!selected) return
    try { await navigator.clipboard.writeText(selected.text); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { setError('No se pudo copiar en este navegador.') }
  }

  function downloadQr() {
    if (!qrImage || !selected) return
    const link = document.createElement('a'); link.href = qrImage; link.download = `${safeName(selected.text)}-qr.png`; link.click()
  }

  function downloadBarcode() {
    if (!selected || !barcodeRef.current) return
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, selected.text, { format: 'CODE128', displayValue: true, font: 'monospace', fontSize: 18, textMargin: 8, margin: 20, height: 90, width: 2, background: '#ffffff', lineColor: '#183c30' })
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = `${safeName(selected.text)}-barras.png`; link.click()
  }

  function deleteRecord(id) {
    const next = records.filter((item) => item.id !== id)
    setRecords(next)
    if (selectedId === id) setSelectedId(next[0]?.id || null)
  }

  function clearHistory() { setRecords([]); setSelectedId(null); setMenuOpen(false) }

  useEffect(() => {
    if (!expandedCode) return undefined
    function closeOnEscape(event) { if (event.key === 'Escape') setExpandedCode(null) }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [expandedCode])

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#182320]">
      <header className="border-b border-[#e7ebe7] bg-white/80">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <a href="#inicio" className="flex items-center gap-3 no-underline" aria-label="Clave, inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#153d30] text-white"><QrCode size={19} strokeWidth={2.2} /></span>
            <span className="text-[20px] font-bold tracking-[-0.7px] text-[#18392f]">clave<span className="text-[#47a982]">.</span></span>
          </a>
          <div className="hidden items-center gap-2 rounded-full bg-[#f3f6f3] px-3.5 py-2 text-[12px] font-medium text-[#567067] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#49aa7e]" /> Tus datos se guardan localmente</div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#73817b]"><span className="hidden sm:inline">ESP</span><ChevronDown size={15} /></div>
        </div>
      </header>

      <main id="inicio" className="mx-auto max-w-[1320px] px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#dcece3] bg-[#eff8f2] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.4px] text-[#31845e]"><Sparkles size={12} /> Herramienta gratuita</div>
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-1.6px] text-[#18392f] sm:text-[42px]">Tus códigos, <span className="text-[#58a982]">al instante.</span></h1>
            <p className="mt-2 max-w-[550px] text-[14px] leading-6 text-[#76827d]">Convierte cualquier texto en un código QR y de barras listo para descargar.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-[#e7ebe7] bg-white px-3.5 py-2.5 text-[12px] text-[#74817b] sm:self-auto"><span className="h-2 w-2 rounded-full bg-[#54ae83]" /> Base de datos local <span className="mx-0.5 text-[#d4dad6]">·</span> Privado y seguro</div>
        </section>

        <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_365px]">
          <div className="contents lg:block lg:space-y-5">
            <form onSubmit={generate} className="order-1 rounded-2xl border border-[#e6eae6] bg-white p-4 shadow-[0_2px_10px_rgba(31,52,41,.025)] sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf6f0] text-[#3f916b]"><FileText size={17} /></div>
                <div><h2 className="text-[15px] font-semibold text-[#203a31]">Crear nuevo código</h2><p className="mt-0.5 text-[12px] text-[#89938e]">Ingresa el texto que quieres convertir</p></div>
              </div>
              <label htmlFor="code-text" className="mb-2 block text-[12px] font-semibold text-[#52655c]">Texto o identificador</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <input id="code-text" value={value} onChange={(event) => { setValue(event.target.value); setError('') }} maxLength={180} placeholder="Ej. TEXTOBAR001" className="h-12 w-full rounded-xl border border-[#e1e7e2] bg-[#fcfdfc] px-4 pr-[76px] text-[14px] font-medium tracking-[.2px] text-[#243d33] outline-none transition placeholder:text-[#b2bbb6] focus:border-[#69ae87] focus:bg-white focus:ring-3 focus:ring-[#70b88f]/10" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-[#a1aaa5]">{value.length}/180</span>
                </div>
                <button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1e4939] px-5 text-[13px] font-semibold text-white transition hover:bg-[#153d30] active:scale-[.98]">Generar códigos <ArrowRight size={15} /></button>
              </div>
              {error && <p role="alert" className="mt-2 text-[12px] font-medium text-[#c45555]">{error}</p>}
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#9aa39e]"><span>Admite letras, números y símbolos</span><button type="button" onClick={() => setValue(STARTER)} className="font-medium text-[#508b6c] hover:text-[#245b40]">Usar ejemplo</button></div>
            </form>

            <div className="order-3 overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-[0_2px_10px_rgba(31,52,41,.025)]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#edf0ed] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f4ee] text-[#7c8c73]"><History size={17} /></div><div><h2 className="text-[15px] font-semibold text-[#203a31]">Generados recientemente</h2><p className="mt-0.5 text-[12px] text-[#89938e]">{records.length} {records.length === 1 ? 'código guardado' : 'códigos guardados'}</p></div></div>
                <div className="flex items-center gap-2">
                  <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9da8a1]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar..." aria-label="Buscar códigos" className="h-9 w-[148px] rounded-lg border border-[#e9ede9] bg-[#fcfdfc] pl-8 pr-3 text-[12px] outline-none focus:border-[#8ab99a] sm:w-[170px]" /></div>
                  <div className="flex rounded-lg bg-[#f4f6f3] p-1"><button type="button" onClick={() => setActiveTab('Todos')} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${activeTab === 'Todos' ? 'bg-white text-[#315a46] shadow-sm' : 'text-[#8a9690]'}`}>Todos</button><button type="button" onClick={() => setActiveTab('Hoy')} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${activeTab === 'Hoy' ? 'bg-white text-[#315a46] shadow-sm' : 'text-[#8a9690]'}`}>Hoy</button></div>
                </div>
              </div>
              {filtered.length === 0 ? <div className="flex min-h-[180px] flex-col items-center justify-center px-5 text-center"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f2f6f2] text-[#8da994]"><Clock3 size={18} /></div><p className="text-[13px] font-semibold text-[#506259]">{records.length ? 'No hay resultados' : 'Aún no hay códigos'}</p><p className="mt-1 text-[12px] text-[#9aa49e]">{records.length ? 'Prueba con otro texto de búsqueda.' : 'Tus códigos aparecerán aquí al generarlos.'}</p></div> : <div className="divide-y divide-[#f0f2f0]">
                {filtered.map((item) => <div key={item.id} role="button" tabIndex={0} onClick={() => selectRecord(item.id)} onKeyDown={(event) => event.key === 'Enter' && selectRecord(item.id)} className={`group flex min-h-[64px] cursor-pointer items-center gap-3 px-4 py-3.5 transition hover:bg-[#fafcf9] sm:px-6 ${selectedId === item.id ? 'bg-[#f5faf6]' : ''}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedId === item.id ? 'bg-[#e5f3e9] text-[#438c65]' : 'bg-[#f2f4f1] text-[#9aa69d]'}`}><Barcode size={18}/></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-mono text-[13px] font-semibold tracking-[.3px] text-[#32483d]">{item.text}</p><p className="mt-1 text-[11px] text-[#9aa49e]">{formatDate(item.createdAt)}</p></div>
                  <span className="hidden rounded-full bg-[#eff7f1] px-2.5 py-1 text-[10px] font-semibold text-[#538767] sm:inline-flex">QR + Barras</span>
                  <button type="button" aria-label={`Eliminar ${item.text}`} onClick={(event) => { event.stopPropagation(); deleteRecord(item.id) }} className="rounded-lg p-2 text-[#aab3ad] opacity-100 transition hover:bg-[#fff0f0] hover:text-[#c95e5e] sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"><Trash2 size={15}/></button>
                </div>)}
              </div>}
              {records.length > 0 && <div className="flex items-center justify-between border-t border-[#edf0ed] px-5 py-3 text-[11px] text-[#9aa49e] sm:px-6"><span>Guardado solo en este dispositivo</span><div className="relative"><button type="button" onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-1.5 font-semibold text-[#74827a] hover:text-[#355e48]">Opciones <ChevronDown size={13}/></button>{menuOpen && <div className="absolute bottom-8 right-0 z-10 w-40 rounded-xl border border-[#e8ece8] bg-white p-1.5 shadow-lg"><button onClick={clearHistory} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[#b44f4f] hover:bg-[#fff5f5]"><Trash2 size={13}/> Borrar historial</button></div>}</div></div>}
            </div>
          </div>

          <aside className="order-2 overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-[0_2px_10px_rgba(31,52,41,.025)] lg:sticky lg:top-5">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-5 py-4"><div><h2 className="text-[15px] font-semibold text-[#203a31]">Vista previa</h2><p className="mt-0.5 text-[12px] text-[#89938e]">Tus códigos listos para usar</p></div><div className="relative"><button type="button" aria-label="Opciones de descarga" onClick={() => setMenuOpen(menuOpen === 'download' ? false : 'download')} className="rounded-lg p-2 text-[#87948c] hover:bg-[#f4f7f4]"><ArrowDownToLine size={17}/></button>{menuOpen === 'download' && <div className="absolute right-0 top-10 z-10 w-44 rounded-xl border border-[#e8ece8] bg-white p-1.5 shadow-lg"><button onClick={() => {downloadQr();setMenuOpen(false)}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[#4d6257] hover:bg-[#f5f8f5]">Descargar QR (PNG)</button><button onClick={() => {downloadBarcode();setMenuOpen(false)}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[#4d6257] hover:bg-[#f5f8f5]">Descargar barras (PNG)</button></div>}</div></div>
            {selected ? <div className="p-5">
              <div className="mb-4 flex items-center justify-between"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf7ef] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.8px] text-[#45845c]"><span className="h-1.5 w-1.5 rounded-full bg-[#55ad77]"/> Generado</span><span className="text-[10px] text-[#a1aaa4]">{formatTime(selected.createdAt)}</span></div>
              <button type="button" onClick={() => setExpandedCode('qr')} aria-label={`Ampliar código QR de ${selected.text} para escanear`} className="group block w-full rounded-xl border border-[#edf0ed] bg-[#fbfcfb] p-3.5 text-left transition hover:border-[#c9dfcf] focus:outline-none focus:ring-2 focus:ring-[#70b88f]/40"><span className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[1px] text-[#91a098]">Código QR</span><span className="flex items-center gap-1 text-[10px] font-semibold text-[#5e9a72]"><QrCode size={14}/> Toca para ampliar</span></span><span className="soft-grid flex aspect-square items-center justify-center rounded-lg bg-white p-3 sm:p-4">{qrImage ? <img src={qrImage} alt={`Código QR para ${selected.text}`} className="h-full w-full object-contain"/> : <span className="h-10 w-10 animate-pulse rounded bg-[#edf2ed]"/>}</span></button>
              <button type="button" onClick={() => setExpandedCode('barcode')} aria-label={`Ampliar código de barras de ${selected.text} para escanear`} className="group mt-3 block w-full rounded-xl border border-[#edf0ed] bg-[#fbfcfb] p-3.5 text-left transition hover:border-[#c9dfcf] focus:outline-none focus:ring-2 focus:ring-[#70b88f]/40"><span className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[1px] text-[#91a098]">Código de barras</span><span className="flex items-center gap-1 text-[10px] font-semibold text-[#5e9a72]"><Barcode size={14}/> Toca para ampliar</span></span><span className="flex h-[76px] items-center justify-center overflow-hidden rounded-lg bg-white px-3" ref={barcodeRef} dangerouslySetInnerHTML={{ __html: barcodeImage }}/><span className="mt-1 block truncate text-center font-mono text-[11px] tracking-[1px] text-[#53675c]">{selected.text}</span></button>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#f5f8f5] px-3.5 py-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.8px] text-[#97a29b]">Contenido</p><p className="mt-1 truncate font-mono text-[12px] font-semibold text-[#365044]">{selected.text}</p></div><button type="button" onClick={copyText} title="Copiar texto" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e4ebe5] bg-white text-[#718379] transition hover:border-[#b5d5bd] hover:text-[#43835d]">{copied ? <Check size={15}/> : <Copy size={15}/>}</button></div>
              {copied && <p className="mt-2 text-right text-[11px] font-medium text-[#508b68]">Texto copiado</p>}
            </div> : <div className="flex min-h-[380px] flex-col items-center justify-center px-7 text-center"><div className="relative mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-[#eef6ef] text-[#6d9b7c]"><QrCode size={32}/><span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-4 border-white bg-[#dceee0] text-[#5a8c67]"><Barcode size={16}/></span></div><p className="text-[14px] font-semibold text-[#445a4e]">Tus códigos aparecerán aquí</p><p className="mt-1.5 max-w-[220px] text-[12px] leading-5 text-[#9aa49e]">Escribe un texto y genera tu primer QR y código de barras.</p></div>}
            <div className="flex items-center gap-2 border-t border-[#edf0ed] px-5 py-3.5 text-[10px] leading-4 text-[#9ba59f]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f1f5f1] text-[#82988a]">i</span>QR estándar y código de barras Code 128</div>
          </aside>
        </section>
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#e8ece8] pt-5 text-[11px] text-[#a0aaa4] sm:flex-row"><span>© {new Date().getFullYear()} clave. Generador de códigos.</span><span>Hecho para crear, guardar y compartir fácilmente.</span></footer>
      </main>
      {expandedCode && selected && <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-[#f7f8f6] px-5 py-6 sm:px-8" role="dialog" aria-modal="true" aria-labelledby="scan-title">
        <button type="button" onClick={() => setExpandedCode(null)} aria-label="Cerrar código ampliado" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#e3eae4] bg-white text-[#53695d] shadow-sm transition hover:bg-[#f2f7f2] sm:right-8 sm:top-8"><X size={20}/></button>
        <div className="mb-5 text-center sm:mb-7"><span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eaf5ed] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-[#4c8b62]">{expandedCode === 'qr' ? <><QrCode size={13}/> Listo para escanear</> : <><Barcode size={13}/> Listo para escanear</>}</span><h2 id="scan-title" className="text-[22px] font-semibold tracking-[-.6px] text-[#18392f] sm:text-[26px]">{expandedCode === 'qr' ? 'Apunta la cámara a este QR' : 'Apunta el lector a este código'}</h2><p className="mx-auto mt-1.5 max-w-[80vw] truncate font-mono text-[13px] text-[#75837b]">{selected.text}</p></div>
        {expandedCode === 'qr' ? <div className="flex w-[min(86vw,64vh,560px)] items-center justify-center rounded-[24px] border border-[#e2eae3] bg-white p-[clamp(12px,3vw,24px)] shadow-[0_16px_60px_rgba(31,68,46,.12)]">{qrImage ? <img src={qrImage} alt={`Código QR grande para escanear: ${selected.text}`} className="block aspect-square w-full object-contain"/> : <div className="aspect-square w-full animate-pulse rounded-xl bg-[#edf2ed]"/>}</div> : <div className="scan-barcode flex min-h-[190px] w-[min(90vw,720px)] items-center justify-center overflow-x-auto rounded-[24px] border border-[#e2eae3] bg-white px-4 py-7 shadow-[0_16px_60px_rgba(31,68,46,.12)]" dangerouslySetInnerHTML={{ __html: barcodeImage }} />}
        <div className="mt-5 flex items-center gap-2 text-center text-[12px] text-[#839188] sm:mt-7"><span className="h-2 w-2 shrink-0 rounded-full bg-[#5bad7b]"/> Mantén el brillo de la pantalla alto para facilitar la lectura</div>
        <button type="button" onClick={() => setExpandedCode(null)} className="mt-6 min-h-12 rounded-xl bg-[#1e4939] px-8 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#153d30]">Listo</button>
      </div>}
    </div>
  )
}

function safeName(text) { return text.replace(/[^a-z0-9-_]/gi, '_').slice(0, 40) || 'codigo' }
function formatDate(value) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }
function formatTime(value) { return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

export default App
