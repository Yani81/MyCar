import { useRef, useState } from 'react'
import styles from './Header.module.css'
import { IconChevron, IconCar, IconTrash, IconPencil, IconMenu, IconGear, IconUser, IconGauge, IconDocument, IconBell, IconMoon, IconDownload, IconInfo } from './icons'
import { Modal } from '../ui/Modal'
import { Field, Row, inputClass, selectClass, Segmented, CheckGroup } from '../ui/Field'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useAuth } from '../../store/useAuth'
import { FUEL_LABELS, type FuelType, type Vehicle } from '../../types'
import { exportVehiclePDF, exportVehicleCSV } from '../../lib/export'
import { downloadBackupJSON, parseBackupJSON } from '../../lib/backup'
import { saveToCloud, getLastSyncAt } from '../../lib/sync'
import { supabase } from '../../lib/supabase'
import type { Tab } from './BottomNav'
import { normalizePlate } from '../../lib/plate'

type ModalView = 'none' | 'garage' | 'add' | 'edit' | 'settings' | 'account' | 'export' | 'set-theme' | 'set-notify' | 'set-backup' | 'about'

export function Header({ go }: { go: (t: Tab) => void }) {
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

  const notifyDaysAhead = useStore((s) => s.notifyDaysAhead)
  const setNotifyDaysAhead = useStore((s) => s.setNotifyDaysAhead)

  const [modal, setModal] = useState<ModalView>('none')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifPermission, setNotifPermission] = useState(
    () => ('Notification' in window ? Notification.permission : 'unsupported')
  )
  const [syncState, setSyncState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [deleting, setDeleting] = useState(false)

  const dateTimeBg = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  const syncNow = async () => {
    setSyncState('busy')
    const s = useStore.getState()
    await saveToCloud({
      vehicles: s.vehicles,
      refuels: s.refuels,
      expenses: s.expenses,
      incomes: s.incomes,
      trips: s.trips,
      readings: s.readings,
      reminders: s.reminders,
      activeVehicleId: s.activeVehicleId,
      theme: s.theme,
      notifyDaysAhead: s.notifyDaysAhead,
    })
    setSyncState('done')
  }

  const deleteAccount = async () => {
    if (!user) return
    if (!confirm('Изтриване на акаунта? Това премахва акаунта, облачните данни и снимките БЕЗВЪЗВРАТНО.')) return
    if (!confirm('Сигурен ли си? Действието не може да бъде отменено.')) return
    setDeleting(true)
    try {
      // Снимките в bucket-а receipts ({user_id}/...) — на страници по 100
      for (;;) {
        const { data: files } = await supabase.storage.from('receipts').list(user.id, { limit: 100 })
        if (!files || files.length === 0) break
        await supabase.storage.from('receipts').remove(files.map((f) => `${user.id}/${f.name}`))
        if (files.length < 100) break
      }
      const { error } = await supabase.rpc('delete_account')
      if (error) throw error
      localStorage.removeItem('mycar-store-v2')
      window.location.reload()
    } catch {
      setDeleting(false)
      alert('Изтриването не успя. Функцията delete_account трябва да е инсталирана в Supabase (supabase/delete-account.sql).')
    }
  }
  const importInputRef = useRef<HTMLInputElement>(null)

  const menuItems: { label: string; Icon: typeof IconGauge; action: () => void }[] = [
    { label: 'Табло', Icon: IconGauge, action: () => go('dashboard') },
    { label: 'Гараж', Icon: IconCar, action: () => setModal('garage') },
    { label: 'Доклади', Icon: IconDocument, action: () => setModal('export') },
    { label: 'Настройки', Icon: IconGear, action: () => setModal('settings') },
    { label: 'Акаунт', Icon: IconUser, action: () => setModal('account') },
    { label: 'Относно', Icon: IconInfo, action: () => setModal('about') },
  ]

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
      serviceCategories: s.serviceCategories,
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
        serviceCategories: data.serviceCategories,
      })
      setModal('none')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Файлът не може да бъде прочетен.')
    }
  }

  // Add vehicle state
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [fuel1, setFuel1] = useState<FuelType>('petrol')
  const [fuel2, setFuel2] = useState<FuelType | 'none'>('none')
  const [odo, setOdo] = useState('')

  // Edit vehicle state
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [editMake, setEditMake] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editPlate, setEditPlate] = useState('')
  const [editOdo, setEditOdo] = useState('')
  const [editFuel1, setEditFuel1] = useState<FuelType>('petrol')
  const [editFuel2, setEditFuel2] = useState<FuelType | 'none'>('none')

  // Export state
  const [exportPeriod, setExportPeriod] = useState<'all' | 'custom'>('all')
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState(new Date().toLocaleDateString('sv'))
  const [expRefuels, setExpRefuels] = useState(true)
  const [expExpenses, setExpExpenses] = useState(true)
  const [expServices, setExpServices] = useState(true)
  const [expIncomes, setExpIncomes] = useState(true)
  const [expTrips, setExpTrips] = useState(true)
  const [expReadings, setExpReadings] = useState(true)

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
      refuels: expRefuels ? forVehicle(refuels) : [],
      expenses: forVehicle(expenses).filter((e) =>
        e.kind === 'service' ? expServices : expExpenses
      ),
      incomes: expIncomes ? forVehicle(incomes) : [],
      trips: expTrips ? forVehicle(trips) : [],
      readings: expReadings ? forVehicle(readings) : [],
      reminders: reminders.filter((r) => r.vehicleId === active!.id),
      period: exportPeriod === 'custom' ? { from: exportFrom, to: exportTo } : undefined,
    }
  }

  const openEdit = (e: React.MouseEvent, v: Vehicle) => {
    e.stopPropagation()
    setEditing(v)
    // Стари автомобили без марка/модел: името отива в „Марка", за да не се изгуби при запис
    setEditMake(v.make ?? v.name)
    setEditModel(v.model ?? '')
    setEditPlate(v.plate ?? '')
    setEditOdo(String(v.initialOdometer || ''))
    setEditFuel1(v.fuels[0])
    setEditFuel2(v.fuels[1] ?? 'none')
    setModal('edit')
  }

  const saveEdit = () => {
    if (!editing || !editMake.trim()) return
    const fuels: FuelType[] = editFuel2 !== 'none' && editFuel2 !== editFuel1 ? [editFuel1, editFuel2] : [editFuel1]
    updateVehicle(editing.id, {
      name: `${editMake.trim()} ${editModel.trim()}`.trim(),
      make: editMake.trim(),
      model: editModel.trim() || undefined,
      plate: editPlate.trim() || undefined,
      initialOdometer: Number(editOdo) || 0,
      fuels,
    })
    setEditing(null)
    setModal('garage')
  }

  const submitVehicle = () => {
    if (!make.trim()) return
    const fuels: FuelType[] = fuel2 !== 'none' && fuel2 !== fuel1 ? [fuel1, fuel2] : [fuel1]
    addVehicle({
      name: `${make.trim()} ${model.trim()}`.trim(),
      make: make.trim(),
      model: model.trim() || undefined,
      plate: plate.trim() || undefined,
      fuels,
      initialOdometer: Number(odo) || 0,
    })
    setMake(''); setModel(''); setPlate(''); setOdo(''); setFuel1('petrol'); setFuel2('none')
    setModal('garage')
  }

  const fuelOptions = Object.entries(FUEL_LABELS).map(([k, l]) => (
    <option key={k} value={k}>{l}</option>
  ))

  if (!active) return null

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerRow}>
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
          <button className={styles.menuBtn} onClick={() => setMenuOpen(true)} aria-label="Меню">
            <IconMenu width={24} height={24} />
          </button>
        </div>
      </header>

      {/* ── Странично меню ── */}
      {menuOpen && (
        <div className={styles.drawerOverlay} onClick={() => setMenuOpen(false)}>
          <nav className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>MyCar</div>
            {menuItems.map(({ label, Icon, action }) => (
              <button key={label} className={styles.drawerItem} onClick={() => { setMenuOpen(false); action() }}>
                <Icon width={20} height={20} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

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
      </Modal>

      {/* ── Настройки (списък) ── */}
      <Modal open={modal === 'settings'} title="Настройки" onClose={() => setModal('none')}>
        <div className={styles.list}>
          {([
            { view: 'set-theme' as const, label: 'Тема', sub: theme === 'auto' ? 'Авто' : theme === 'light' ? 'Светла' : 'Тъмна', Icon: IconMoon },
            { view: 'set-notify' as const, label: 'Известия', sub: notifyDaysAhead > 0 ? `${notifyDaysAhead} дни предварително` : 'Изключени', Icon: IconBell },
            { view: 'set-backup' as const, label: 'Резервно копие', sub: 'JSON — изтегляне и възстановяване', Icon: IconDownload },
          ]).map(({ view, label, sub, Icon }) => (
            <button key={view} className={styles.setRow} onClick={() => setModal(view)}>
              <span className={styles.setIcon}><Icon width={19} height={19} /></span>
              <span className={styles.setInfo}>
                <span className={styles.setLabel}>{label}</span>
                <span className={styles.setSub}>{sub}</span>
              </span>
              <IconChevron width={16} height={16} className={styles.setChev} />
            </button>
          ))}
        </div>
      </Modal>

      {/* ── Настройки → Тема ── */}
      <Modal open={modal === 'set-theme'} title="Тема" onClose={() => setModal('settings')}>
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'auto', label: 'Авто' },
            { value: 'light', label: 'Светла' },
            { value: 'dark', label: 'Тъмна' },
          ]}
        />
      </Modal>

      {/* ── Настройки → Известия ── */}
      <Modal open={modal === 'set-notify'} title="Известия" onClose={() => setModal('settings')}>
        <div className={styles.exportBlock} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <span className={styles.exportLabel}>Известия за напомняния</span>
          <Segmented
            value={String(notifyDaysAhead)}
            onChange={(v) => setNotifyDaysAhead(Number(v))}
            options={[
              { value: '0', label: 'Изкл.' },
              { value: '3', label: '3 дни' },
              { value: '7', label: '7 дни' },
              { value: '14', label: '14 дни' },
            ]}
          />
          {notifyDaysAhead > 0 && (
            <div className={styles.notifStatus}>
              {notifPermission === 'unsupported' && 'Не се поддържа на това устройство (на iPhone работи само като инсталирано приложение).'}
              {notifPermission === 'granted' && '✓ Известията са разрешени в браузъра.'}
              {notifPermission === 'denied' && 'Блокирани са — разреши ги от настройките на браузъра.'}
              {notifPermission === 'default' && (
                <button
                  className={styles.exportBtn}
                  onClick={() => Notification.requestPermission().then(setNotifPermission)}
                >
                  Разреши известията
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Настройки → Резервно копие ── */}
      <Modal open={modal === 'set-backup'} title="Резервно копие" onClose={() => setModal('settings')}>
        <div className={styles.exportBlock} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <span className={styles.exportLabel}>Всички автомобили и записи</span>
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
      </Modal>

      {/* ── Доклади (експорт на данни) ── */}
      <Modal open={modal === 'export'} title="Доклади" onClose={() => setModal('none')}>
        <div className={styles.exportBlock} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <span className={styles.exportLabel}>Експорт на данни · {active.name}</span>
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
          <Field label="Съдържание на доклада">
            <CheckGroup
              items={[
                { label: 'Зареждания', checked: expRefuels, onChange: setExpRefuels },
                { label: 'Разходи', checked: expExpenses, onChange: setExpExpenses },
                { label: 'Ремонти', checked: expServices, onChange: setExpServices },
                { label: 'Приходи', checked: expIncomes, onChange: setExpIncomes },
                { label: 'Маршрути', checked: expTrips, onChange: setExpTrips },
                { label: 'Километраж', checked: expReadings, onChange: setExpReadings },
              ]}
            />
          </Field>
          <div className={styles.exportButtons} style={{ marginTop: 14 }}>
            <button className={styles.exportBtn} onClick={() => exportVehiclePDF(exportData())}>PDF</button>
            <button className={styles.exportBtn} onClick={() => exportVehicleCSV(exportData())}>CSV</button>
          </div>
        </div>
      </Modal>

      {/* ── Акаунт ── */}
      <Modal open={modal === 'account'} title="Акаунт" onClose={() => { setSyncState('idle'); setModal('none') }}>
        {user ? (
          <>
            <div className={styles.accList}>
              <div className={styles.accRow}><span>Имейл</span><b>{user.email}</b></div>
              <div className={styles.accRow}><span>Регистриран на</span><b>{user.created_at ? new Date(user.created_at).toLocaleDateString('bg-BG') : '—'}</b></div>
              <div className={styles.accRow}><span>Последен вход</span><b>{dateTimeBg(user.last_sign_in_at)}</b></div>
              <div className={styles.accRow}><span>Автомобили</span><b>{vehicles.length}</b></div>
              <div className={styles.accRow}>
                <span>Записи общо</span>
                <b>{refuels.length + expenses.length + incomes.length + trips.length + readings.length + reminders.length}</b>
              </div>
              <div className={styles.accRow}>
                <span>Последна синхронизация</span>
                <b>{syncState === 'busy' ? 'Синхронизира…' : getLastSyncAt() ? dateTimeBg(getLastSyncAt()) : 'още не'}</b>
              </div>
            </div>
            <button className={styles.exportBtn} style={{ width: '100%', marginTop: 12 }} disabled={syncState === 'busy'} onClick={syncNow}>
              {syncState === 'done' ? '✓ Синхронизирано' : 'Синхронизирай сега'}
            </button>
            <div className={styles.accountBlock}>
              <span className={styles.accountEmail}>Изход от акаунта на това устройство</span>
              <button className={styles.signOut} onClick={signOut}>Изход</button>
            </div>
            <button className={styles.dangerBtn} disabled={deleting} onClick={deleteAccount}>
              {deleting ? 'Изтрива…' : 'Изтрий акаунта'}
            </button>
          </>
        ) : (
          <div className="empty">Няма активен акаунт.</div>
        )}
      </Modal>

      {/* ── Относно ── */}
      <Modal open={modal === 'about'} title="Относно" onClose={() => setModal('none')}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <img src="icon-192.png" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
          <b style={{ fontSize: 17 }}>MyCar</b>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Разходи, гориво и поддръжка на автомобила</span>
        </div>
        <div className={styles.accList}>
          <div className={styles.accRow}><span>Версия</span><b>{__APP_VERSION__}</b></div>
        </div>
      </Modal>

      {/* ── Нов автомобил ── */}
      <Modal open={modal === 'add'} title="Нов автомобил" onClose={() => setModal('garage')}>
        <div className={styles.addForm}>
          <Row>
            <Field label="Марка">
              <input className={inputClass} value={make} onChange={(e) => setMake(e.target.value)} placeholder="напр. Volkswagen" />
            </Field>
            <Field label="Модел">
              <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} placeholder="напр. Golf" />
            </Field>
          </Row>
          <Row>
            <Field label="Рег. номер" hint="Само латиница · CB 1234 AB">
              <input className={inputClass} value={plate} onChange={(e) => setPlate(normalizePlate(e.target.value))} placeholder="CB 1234 AB" />
            </Field>
            <Field label="Начален километраж">
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
          <Row>
            <Field label="Марка">
              <input className={inputClass} value={editMake} onChange={(e) => setEditMake(e.target.value)} placeholder="напр. Volkswagen" />
            </Field>
            <Field label="Модел">
              <input className={inputClass} value={editModel} onChange={(e) => setEditModel(e.target.value)} placeholder="напр. Golf" />
            </Field>
          </Row>
          <Row>
            <Field label="Рег. номер" hint="Само латиница · CB 1234 AB">
              <input className={inputClass} value={editPlate} onChange={(e) => setEditPlate(normalizePlate(e.target.value))} placeholder="CB 1234 AB" />
            </Field>
            <Field label="Начален километраж">
              <input className={inputClass} inputMode="numeric" value={editOdo} onChange={(e) => setEditOdo(e.target.value)} placeholder="0" />
            </Field>
          </Row>
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
