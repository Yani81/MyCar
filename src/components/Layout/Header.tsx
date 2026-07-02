import { useRef, useState } from 'react'
import styles from './Header.module.css'
import { IconChevron, IconCar, IconTrash, IconPencil } from './icons'
import { Modal } from '../ui/Modal'
import { Field, Row, inputClass, selectClass, Segmented } from '../ui/Field'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useAuth } from '../../store/useAuth'
import { FUEL_LABELS, type FuelType, type Vehicle } from '../../types'
import { exportVehiclePDF, exportVehicleCSV } from '../../lib/export'
import { downloadBackupJSON, parseBackupJSON } from '../../lib/backup'

type ModalView = 'none' | 'garage' | 'add' | 'edit'

const PLATE_MAP: Record<string, string> = {
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M',
  'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'У': 'U', 'Х': 'X',
}

function normalizePlate(val: string): string {
  return val.toUpperCase().replace(/./gu, (c) => PLATE_MAP[c] ?? c)
}

export function Header() {
  const vehicles = useStore((s) => s.vehicles)
  const active = useActiveVehicle()
  const setActiveVehicle = useStore((s) => s.setActiveVehicle)
  const addVehicle = useStore((s) => s.addVehicle)
  const updateVehicle = useStore((s) => s.updateVehicle)
  const removeVehicle = useStore((s) => s.removeVehicle)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const { user, signOut } = useAuth()
  const refuels = useStore((s) => s.refuels)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const trips = useStore((s) => s.trips)
  const readings = useStore((s) => s.readings)
  const reminders = useStore((s) => s.reminders)

  const [modal, setModal] = useState<ModalView>('none')
  const importInputRef = useRef<HTMLInputElement>(null)

  const exportBackup = () => {
    const s = useStore.getState()
    downloadBackupJSON({
      vehicles: s.vehicles,
      refuels: s.refuels,
      expenses: s.expenses,
      incomes: s.incomes,
      trips: s.trips,
      readings: s.readings,
      reminders: s.reminders,
      activeVehicleId: s.activeVehicleId,
      theme: s.theme,
      vehicleChecks: s.vehicleChecks,
      serviceShops: s.serviceShops,
    })
  }

  const importBackup = async (file: File) => {
    try {
      const data = parseBackupJSON(await file.text())
      const when = data.exportedAt ? ` от ${new Date(data.exportedAt).toLocaleDateString('bg-BG')}` : ''
      if (!confirm(`Възстановяване на бекъп${when}? Това ще замени ВСИЧКИ текущи данни.`)) return
      useStore.setState({
        vehicles: data.vehicles,
        refuels: data.refuels,
        expenses: data.expenses,
        incomes: data.incomes,
        trips: data.trips,
        readings: data.readings,
        reminders: data.reminders,
        activeVehicleId: data.vehicles.some((v) => v.id === data.activeVehicleId)
          ? data.activeVehicleId
          : data.vehicles[0].id,
        theme: data.theme,
        vehicleChecks: data.vehicleChecks,
        serviceShops: data.serviceShops,
      })
      setModal('none')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Файлът не може да бъде прочетен.')
    }
  }

  // Add vehicle state
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')
  const [fuel1, setFuel1] = useState<FuelType>('petrol')
  const [fuel2, setFuel2] = useState<FuelType | 'none'>('none')
  const [odo, setOdo] = useState('')

  // Edit vehicle state
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [editName, setEditName] = useState('')
  const [editPlate, setEditPlate] = useState('')
  const [editFuel1, setEditFuel1] = useState<FuelType>('petrol')
  const [editFuel2, setEditFuel2] = useState<FuelType | 'none'>('none')

  // Export state
  const [exportPeriod, setExportPeriod] = useState<'all' | 'custom'>('all')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState(new Date().toLocaleDateString('sv'))

  const exportData = () => {
    const inRange = (date: string) => {
      if (exportPeriod === 'all') return true
      if (exportFrom && date < exportFrom) return false
      if (exportTo && date > exportTo) return false
      return true
    }
    const forVehicle = <T extends { vehicleId: string; date: string }>(arr: T[]) =>
      arr.filter((x) => x.vehicleId === active!.id && inRange(x.date))
    return {
      vehicle: active!,
      refuels: forVehicle(refuels),
      expenses: forVehicle(expenses),
      incomes: forVehicle(incomes),
      trips: forVehicle(trips),
      readings: forVehicle(readings),
      reminders: reminders.filter((r) => r.vehicleId === active!.id),
      period: exportPeriod === 'custom' ? { from: exportFrom, to: exportTo } : undefined,
    }
  }

  const openEdit = (e: React.MouseEvent, v: Vehicle) => {
    e.stopPropagation()
    setEditing(v)
    setEditName(v.name)
    setEditPlate(v.plate ?? '')
    setEditFuel1(v.fuels[0])
    setEditFuel2(v.fuels[1] ?? 'none')
    setModal('edit')
  }

  const saveEdit = () => {
    if (!editing || !editName.trim()) return
    const fuels: FuelType[] = editFuel2 !== 'none' && editFuel2 !== editFuel1 ? [editFuel1, editFuel2] : [editFuel1]
    updateVehicle(editing.id, { name: editName.trim(), plate: editPlate.trim() || undefined, fuels })
    setEditing(null)
    setModal('garage')
  }

  const submitVehicle = () => {
    if (!name.trim()) return
    const fuels: FuelType[] = fuel2 !== 'none' && fuel2 !== fuel1 ? [fuel1, fuel2] : [fuel1]
    addVehicle({ name: name.trim(), plate: plate.trim() || undefined, fuels, initialOdometer: Number(odo) || 0 })
    setName(''); setPlate(''); setOdo(''); setFuel1('petrol'); setFuel2('none')
    setModal('garage')
  }

  const fuelOptions = Object.entries(FUEL_LABELS).map(([k, l]) => (
    <option key={k} value={k}>{l}</option>
  ))

  if (!active) return null

  return (
    <>
      <header className={styles.header}>
        <button className={styles.selector} onClick={() => setModal('garage')}>
          <span className={styles.iconWrap}>
            <IconCar width={20} height={20} />
          </span>
          <span className={styles.names}>
            <span className={styles.vname}>{active.name}</span>
            <span className={styles.vsub}>
              {active.plate ? active.plate + ' · ' : ''}
              {active.fuels.map((f) => FUEL_LABELS[f]).join(' + ')}
            </span>
          </span>
          <IconChevron width={18} height={18} className={styles.chev} />
        </button>
      </header>

      {/* ── Гараж ── */}
      <Modal open={modal === 'garage'} title="Гараж" onClose={() => setModal('none')}>
        <div className={styles.list}>
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`${styles.vrow} ${v.id === active.id ? styles.vactive : ''}`}
              onClick={() => { setActiveVehicle(v.id); setModal('none') }}
            >
              <div className={styles.vrowInfo}>
                <div className={styles.vrowName}>{v.name}</div>
                <div className={styles.vrowSub}>
                  {v.plate ? v.plate + ' · ' : ''}
                  {v.fuels.map((f) => FUEL_LABELS[f]).join(' + ')}
                </div>
              </div>
              <div className={styles.vrowActions}>
                <button className={styles.edit} onClick={(e) => openEdit(e, v)} title="Редактирай">
                  <IconPencil width={16} height={16} />
                </button>
                {vehicles.length > 1 && (
                  <button
                    className={styles.del}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Изтриване на „${v.name}" и всички свързани данни?`)) removeVehicle(v.id)
                    }}
                    title="Изтрий"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className={styles.ghost} onClick={() => setModal('add')}>+ Нов автомобил</button>

        <div className={styles.exportBlock}>
          <span className={styles.exportLabel}>Експорт на данни</span>
          <Segmented
            value={exportPeriod}
            onChange={(v) => {
              setExportPeriod(v as 'all' | 'custom')
              if (v === 'custom' && !exportFrom) setExportFrom(active!.createdAt.slice(0, 10))
            }}
            options={[
              { value: 'all', label: 'От началото' },
              { value: 'custom', label: 'По дата' },
            ]}
          />
          {exportPeriod === 'custom' && (
            <Row>
              <Field label="От">
                <input className={inputClass} type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
              </Field>
              <Field label="До">
                <input className={inputClass} type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
              </Field>
            </Row>
          )}
          <div className={styles.exportButtons}>
            <button className={styles.exportBtn} onClick={() => exportVehiclePDF(exportData())}>PDF</button>
            <button className={styles.exportBtn} onClick={() => exportVehicleCSV(exportData())}>CSV</button>
          </div>
        </div>

        <div className={styles.exportBlock}>
          <span className={styles.exportLabel}>Резервно копие (всички автомобили)</span>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importBackup(file)
              e.target.value = ''
            }}
          />
          <div className={styles.exportButtons}>
            <button className={styles.exportBtn} onClick={exportBackup}>Изтегли JSON</button>
            <button className={styles.exportBtn} onClick={() => importInputRef.current?.click()}>Възстанови</button>
          </div>
        </div>

        <div className={styles.themeBlock}>
          <span className={styles.themeLabel}>Тема</span>
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'auto', label: 'Авто' },
              { value: 'light', label: 'Светла' },
              { value: 'dark', label: 'Тъмна' },
            ]}
          />
        </div>

        {user && (
          <div className={styles.accountBlock}>
            <span className={styles.accountEmail}>{user.email}</span>
            <button className={styles.signOut} onClick={signOut}>Изход</button>
          </div>
        )}
      </Modal>

      {/* ── Нов автомобил ── */}
      <Modal open={modal === 'add'} title="Нов автомобил" onClose={() => setModal('garage')}>
        <div className={styles.addForm}>
          <Field label="Име">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Golf 6" />
          </Field>
          <Row>
            <Field label="Рег. номер" hint="Само латиница · CB 1234 AB">
              <input className={inputClass} value={plate} onChange={(e) => setPlate(normalizePlate(e.target.value))} placeholder="CB 1234 AB" />
            </Field>
            <Field label="Начален км">
              <input className={inputClass} inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value)} placeholder="0" />
            </Field>
          </Row>
          <Field label="Гориво (резервоар 1)">
            <select className={selectClass} value={fuel1} onChange={(e) => setFuel1(e.target.value as FuelType)}>{fuelOptions}</select>
          </Field>
          <Field label="Второ гориво (резервоар 2)" hint="за двугоривни коли, напр. газ">
            <select className={selectClass} value={fuel2} onChange={(e) => setFuel2(e.target.value as FuelType | 'none')}>
              <option value="none">Няма</option>
              {fuelOptions}
            </select>
          </Field>
          <div className={styles.editButtons}>
            <button className={styles.ghost} style={{ marginTop: 0 }} onClick={() => setModal('garage')}>Отказ</button>
            <button className={styles.primary} onClick={submitVehicle}>Добави</button>
          </div>
        </div>
      </Modal>

      {/* ── Редактиране ── */}
      <Modal open={modal === 'edit'} title={editing ? `Редактиране · ${editing.name}` : 'Редактиране'} onClose={() => { setEditing(null); setModal('garage') }}>
        <div className={styles.addForm}>
          <Field label="Име">
            <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="напр. Golf 6" />
          </Field>
          <Field label="Рег. номер" hint="Само латиница · CB 1234 AB">
            <input className={inputClass} value={editPlate} onChange={(e) => setEditPlate(normalizePlate(e.target.value))} placeholder="CB 1234 AB" />
          </Field>
          <Field label="Гориво (резервоар 1)">
            <select className={selectClass} value={editFuel1} onChange={(e) => setEditFuel1(e.target.value as FuelType)}>{fuelOptions}</select>
          </Field>
          <Field label="Второ гориво (резервоар 2)" hint="за двугоривни коли, напр. газ">
            <select className={selectClass} value={editFuel2} onChange={(e) => setEditFuel2(e.target.value as FuelType | 'none')}>
              <option value="none">Няма</option>
              {fuelOptions}
            </select>
          </Field>
          <div className={styles.editButtons}>
            <button className={styles.ghost} style={{ marginTop: 0 }} onClick={() => { setEditing(null); setModal('garage') }}>Отказ</button>
            <button className={styles.primary} onClick={saveEdit}>Запази</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
