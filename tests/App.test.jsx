import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import App from '../src/App.jsx'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn(async (text) => `data:image/png;base64,${btoa(text)}`) },
}))

vi.mock('jsbarcode', () => ({
  default: vi.fn((target, text) => {
    if (target instanceof SVGElement) {
      target.innerHTML = '<rect width="10" height="40" />'
    }
    target.setAttribute('data-encoded', text)
    return target
  }),
}))

const STORAGE_KEY = 'clave-codes-v1'

function savedRecord(text, id, createdAt = new Date().toISOString()) {
  return { id, text, createdAt }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function historyRow(text) {
  return screen.queryAllByText(text)
    .find((element) => element.closest('[role="button"]'))
    ?.closest('[role="button"]') || null
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Generador de códigos', () => {
  it('muestra el estado vacío cuando no hay historial', () => {
    render(<App />)

    expect(screen.getByText('Aún no hay códigos')).toBeTruthy()
    expect(screen.getByText('Tus códigos aparecerán aquí al generarlos.')).toBeTruthy()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]')
  })

  it('recupera el historial guardado y genera sus vistas QR y Code 128', async () => {
    saveRecords([savedRecord('GUARDADO-01', 'saved-1')])
    render(<App />)

    expect(screen.getAllByText('GUARDADO-01').length).toBeGreaterThan(0)
    expect(await screen.findByRole('img', { name: 'Código QR para GUARDADO-01' })).toBeTruthy()
    expect(JsBarcode).toHaveBeenCalledWith(
      expect.any(SVGElement),
      'GUARDADO-01',
      expect.objectContaining({ format: 'CODE128', displayValue: false }),
    )
  })

  it('tolera historial almacenado que no sea JSON válido', () => {
    localStorage.setItem(STORAGE_KEY, '{inválido')

    render(<App />)

    expect(screen.getByText('Aún no hay códigos')).toBeTruthy()
  })

  it('restaura el texto de ejemplo en el formulario', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Texto o identificador')

    await user.clear(input)
    await user.type(input, 'otro texto')
    await user.click(screen.getByRole('button', { name: 'Usar ejemplo' }))

    expect(input.value).toBe('TEXTOBAR001')
  })

  it('valida texto vacío y texto que excede el límite', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Texto o identificador')

    await user.clear(input)
    await user.click(screen.getByRole('button', { name: /Generar códigos/i }))
    expect(screen.getByRole('alert').textContent).toBe('Escribe un texto para crear tus códigos.')

    fireEvent.change(input, { target: { value: 'x'.repeat(181) } })
    await user.click(screen.getByRole('button', { name: /Generar códigos/i }))
    expect(screen.getByRole('alert').textContent).toBe('Usa un texto de hasta 180 caracteres.')
    expect(screen.getByText('Aún no hay códigos')).toBeTruthy()
  })

  it('recorta el texto nuevo, persiste el registro y abre el QR ampliado', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Texto o identificador')

    await user.clear(input)
    await user.type(input, '  NUEVO-01  ')
    await user.click(screen.getByRole('button', { name: /Generar códigos/i }))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getAllByText('NUEVO-01').length).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([
      expect.objectContaining({ text: 'NUEVO-01', createdAt: expect.any(String) }),
    ])
    expect(screen.getByRole('heading', { name: 'Apunta la cámara a este QR' })).toBeTruthy()
  })

  it('no duplica códigos equivalentes sin distinguir mayúsculas', async () => {
    const user = userEvent.setup()
    saveRecords([savedRecord('CODIGO-01', 'existing-1')])
    render(<App />)
    const input = screen.getByLabelText('Texto o identificador')

    await user.clear(input)
    await user.type(input, 'codigo-01')
    await user.click(screen.getByRole('button', { name: /Generar códigos/i }))

    expect(screen.getAllByText('CODIGO-01').length).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1)
    expect(await screen.findByRole('dialog')).toBeTruthy()
  })

  it('permite buscar registros y filtrar los creados hoy', async () => {
    const user = userEvent.setup()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    saveRecords([
      savedRecord('HOY-01', 'today', new Date().toISOString()),
      savedRecord('AYER-01', 'yesterday', yesterday.toISOString()),
    ])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(historyRow('HOY-01')).toBeTruthy()
    expect(historyRow('AYER-01')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Todos' }))
    await user.type(screen.getByRole('textbox', { name: 'Buscar códigos' }), 'ayer')
    expect(historyRow('AYER-01')).toBeTruthy()
    expect(historyRow('HOY-01')).toBeNull()
  })

  it('selecciona un registro desde el historial y cierra el visor con Escape', async () => {
    const user = userEvent.setup()
    saveRecords([
      savedRecord('PRIMERO', 'first'),
      savedRecord('SEGUNDO', 'second'),
    ])
    render(<App />)

    await user.click(screen.getByText('SEGUNDO'))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Apunta la cámara a este QR' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Código QR para SEGUNDO' })).toBeTruthy()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('elimina el registro seleccionado y selecciona el siguiente disponible', async () => {
    const user = userEvent.setup()
    saveRecords([
      savedRecord('SELECCIONADO', 'selected'),
      savedRecord('SIGUIENTE', 'next'),
    ])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Eliminar SELECCIONADO' }))

    expect(screen.queryByText('SELECCIONADO')).toBeNull()
    expect(screen.getAllByText('SIGUIENTE').length).toBeGreaterThan(0)
    expect(await screen.findByRole('img', { name: 'Código QR para SIGUIENTE' })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([
      expect.objectContaining({ id: 'next', text: 'SIGUIENTE' }),
    ])
  })

  it('borra todo el historial desde Opciones', async () => {
    const user = userEvent.setup()
    saveRecords([savedRecord('PARA-BORRAR', 'delete-all')])
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Opciones' }))
    await user.click(screen.getByRole('button', { name: 'Borrar historial' }))

    expect(screen.getByText('Aún no hay códigos')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([])
  })

  it('muestra el error si falla la generación del QR', async () => {
    QRCode.toDataURL.mockRejectedValueOnce(new Error('fallo QR'))
    saveRecords([savedRecord('ERROR-QR', 'error')])
    render(<App />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('No se pudo generar el código. Prueba con otro texto.')
  })

  it('copia al portapapeles el texto del registro seleccionado', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    saveRecords([savedRecord('COPIAR-01', 'copy')])
    render(<App />)

    await user.click(screen.getByTitle('Copiar texto'))

    expect(writeText).toHaveBeenCalledWith('COPIAR-01')
    expect(await screen.findByText('Texto copiado')).toBeTruthy()
  })

  it('muestra un error si el navegador rechaza la copia', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('sin permiso')) },
    })
    saveRecords([savedRecord('COPIAR-ERROR', 'copy-error')])
    render(<App />)

    await user.click(screen.getByTitle('Copiar texto'))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('No se pudo copiar en este navegador.')
  })

  it('descarga los dos formatos PNG con nombres seguros', async () => {
    const user = userEvent.setup()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,ZmFrZQ==')
    saveRecords([savedRecord('A/B 01', 'download')])
    render(<App />)
    await screen.findByRole('img', { name: 'Código QR para A/B 01' })
    const downloadMenu = screen.getByRole('button', { name: 'Opciones de descarga' })

    await user.click(downloadMenu)
    await user.click(screen.getByRole('button', { name: 'Descargar QR (PNG)' }))
    expect(click).toHaveBeenCalledTimes(1)

    await user.click(downloadMenu)
    await user.click(screen.getByRole('button', { name: 'Descargar barras (PNG)' }))
    expect(click).toHaveBeenCalledTimes(2)
    expect(JsBarcode).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      'A/B 01',
      expect.objectContaining({ format: 'CODE128', displayValue: true }),
    )
  })
})
