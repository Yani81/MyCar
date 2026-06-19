import { useState } from 'react'
import styles from './Header.module.css'
import { IconChevron, IconCar, IconTrash } from './icons'
import { Modal } from '../ui/Modal'
import { Field, Row, inputClass, selectClass, Segmented } from '../ui/Field'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { FUEL_LABELS, type FuelType } from '../../types'

export function Header() {
  const vehicles = useStore((s) => s.vehicles)
  const active = useActiveVehicle()
  const setActiveVehicle = useStore((s) => s.setActiveVehicle)
  const addVehicle = useStore((s) => s.addVehicle)
  const removeVehicle = useStore((s) => s.removeVehicle)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')
  const [fuel1, setFuel1] = useState<FuelType>('petrol')
  const [fuel2, setFuel2] = useState<FuelType | 'none'>('none')
  const [odo, setOdo] = useState('')

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

      <Modal open={open} title="Гараж" onClose={() => setOpen(false)}>
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
              <div>
                <div className={styles.vrowName}>{v.name}</div>
                <div className={styles.vrowSub}>{v.fuels.map((f) => FUEL_LABELS[f]).join(" + ")}</div>
              </div>
              {vehicles.length > 1 && (
                <button
                  className={styles.del}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Изтриване на „${v.name}“ и всички свързани данни?`)) removeVehicle(v.id)
                  }}
                >
                  <IconTrash width={18} height={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        {adding ? (
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
      </Modal>
    </>
  )
}
