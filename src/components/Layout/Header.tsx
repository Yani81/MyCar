import { useState } from 'react'
import styles from './Header.module.css'
import { IconChevron, IconCar, IconTrash, IconPencil } from './icons'
import { Modal } from '../ui/Modal'
import { Field, Row, inputClass, selectClass, Segmented } from '../ui/Field'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useAuth } from '../../store/useAuth'
import { FUEL_LABELS, type FuelType, type Vehicle } from '../../types'

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

  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')
  const [fuel1, setFuel1] = useState<FuelType>('petrol')
  const [fuel2, setFuel2] = useState<FuelType | 'none'>('none')
  const [odo, setOdo] = useState('')

  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [editName, setEditName] = useState('')
  const [editPlate, setEditPlate] = useState('')
  const [editFuel1, setEditFuel1] = useState<FuelType>('petrol')
  const [editFuel2, setEditFuel2] = useState<FuelType | 'none'>('none')

  const openEdit = (e: React.MouseEvent, v: Vehicle) => {
    e.stopPropagation()
    setAdding(false)
    setEditing(v)
    setEditName(v.name)
    setEditPlate(v.plate ?? '')
    setEditFuel1(v.fuels[0])
    setEditFuel2(v.fuels[1] ?? 'none')
  }

  const saveEdit = () => {
    if (!editing || !editName.trim()) return
    const fuels: FuelType[] = editFuel2 !== 'none' && editFuel2 !== editFuel1 ? [editFuel1, editFuel2] : [editFuel1]
    updateVehicle(editing.id, { name: editName.trim(), plate: editPlate.trim() || undefined, fuels })
    setEditing(null)
  }

  const submitVehicle = () => {
    if (!name.trim()) return
    const fuels: FuelType[] = fuel2 !== 'none' && fuel2 !== fuel1 ? [fuel1, fuel2] : [fuel1]
    addVehicle({
      name: name.trim(),
      plate: plate.trim() || undefined,
      fuels,
      initialOdometer: Number(odo) || 0,
    })
    setName('')
    setPlate('')
    setOdo('')
    setFuel1('petrol')
    setFuel2('none')
    setAdding(false)
  }

  if (!active) return null

  return (
    <>
      <header className={styles.header}>
        <button className={styles.selector} onClick={() => setOpen(true)}>
          <span className={styles.iconWrap}>
            <IconCar width={20} height={20} />
          </span>
          <span className={styles.names}>
            <span className={styles.vname}>{active.name}</span>
            <span className={styles.vsub}>
              {active.plate ? active.plate + ' · ' : ''}
              {active.fuels.map((f) => FUEL_LABELS[f]).join(" + ")}
            </span>
          </span>
          <IconChevron width={18} height={18} className={styles.chev} />
        </button>
      </header>

      <Modal open={open} title="Гараж" onClose={() => { setOpen(false); setAdding(false); setEditing(null) }}>
        <div className={styles.list}>
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`${styles.vrow} ${v.id === active.id ? styles.vactive : ''}`}
              onClick={() => {
                setActiveVehicle(v.id)
                setOpen(false)
              }}
            >
              <div className={styles.vrowInfo}>
                <div className={styles.vrowName}>{v.name}</div>
                <div className={styles.vrowSub}>
                  {v.plate ? v.plate + ' · ' : ''}
                  {v.fuels.map((f) => FUEL_LABELS[f]).join(" + ")}
                </div>
              </div>
              <div className={styles.vrowActions}>
                <button
                  className={styles.edit}
                  onClick={(e) => openEdit(e, v)}
                  title="Редактирай"
                >
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

        {editing ? (
          <div className={styles.addForm}>
            <div className={styles.editTitle}>Редактиране: {editing.name}</div>
            <Field label="Име">
              <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="напр. Golf 6" />
            </Field>
            <Field label="Рег. номер">
              <input className={inputClass} value={editPlate} onChange={(e) => setEditPlate(e.target.value)} placeholder="CB 1234 AB" />
            </Field>
            <Field label="Гориво (резервоар 1)">
              <select className={selectClass} value={editFuel1} onChange={(e) => setEditFuel1(e.target.value as FuelType)}>
                {Object.entries(FUEL_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Второ гориво (резервоар 2)" hint="за двугоривни коли, напр. газ">
              <select className={selectClass} value={editFuel2} onChange={(e) => setEditFuel2(e.target.value as FuelType | 'none')}>
                <option value="none">Няма</option>
                {Object.entries(FUEL_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
            <div className={styles.editButtons}>
              <button className={styles.ghost} style={{ marginTop: 0 }} onClick={() => setEditing(null)}>Отказ</button>
              <button className={styles.primary} onClick={saveEdit}>Запази</button>
            </div>
          </div>
        ) : adding ? (
          <div className={styles.addForm}>
            <Field label="Име">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Golf 6" />
            </Field>
            <Row>
              <Field label="Рег. номер">
                <input className={inputClass} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="CB 1234 AB" />
              </Field>
              <Field label="Километраж">
                <input className={inputClass} inputMode="numeric" value={odo} onChange={(e) => setOdo(e.target.value)} placeholder="0" />
              </Field>
            </Row>
            <Field label="Гориво (резервоар 1)">
              <select className={selectClass} value={fuel1} onChange={(e) => setFuel1(e.target.value as FuelType)}>
                {Object.entries(FUEL_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Второ гориво (резервоар 2)" hint="за двугоривни коли, напр. газ">
              <select className={selectClass} value={fuel2} onChange={(e) => setFuel2(e.target.value as FuelType | 'none')}>
                <option value="none">Няма</option>
                {Object.entries(FUEL_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </Field>
            <button className={styles.primary} onClick={submitVehicle}>Добави автомобил</button>
          </div>
        ) : (
          <button className={styles.ghost} onClick={() => setAdding(true)}>+ Нов автомобил</button>
        )}

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
    </>
  )
}
