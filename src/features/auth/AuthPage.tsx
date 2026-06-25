import { useState } from 'react'
import { useAuth } from '../../store/useAuth'
import { Field, inputClass } from '../../components/ui/Field'
import { IconCar } from '../../components/Layout/icons'
import styles from './AuthPage.module.css'

const translateError = (msg: string): string => {
  if (msg.includes('Invalid login credentials')) return 'Невалиден имейл или парола'
  if (msg.includes('User already registered')) return 'Вече има акаунт с този имейл'
  if (msg.includes('Password should be at least')) return 'Паролата трябва да е поне 6 символа'
  if (msg.includes('Unable to validate email address')) return 'Невалиден имейл адрес'
  if (msg.includes('Email not confirmed')) return 'Имейлът не е потвърден — провери пощата си'
  return msg
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { signIn, signUp } = useAuth()

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)

    if (mode === 'login') {
      const err = await signIn(email.trim(), password)
      if (err) setError(translateError(err))
    } else {
      const err = await signUp(email.trim(), password)
      if (err) {
        setError(translateError(err))
      } else {
        setInfo('Провери имейла си за потвърждение, след което влез.')
        switchMode('login')
      }
    }

    setBusy(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <IconCar width={30} height={30} />
        </div>
        <div className={styles.logoName}>MyCar</div>
        <div className={styles.logoSub}>Управление на автомобила</div>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'login' ? styles.tabActive : ''}
            onClick={() => switchMode('login')}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === 'register' ? styles.tabActive : ''}
            onClick={() => switchMode('register')}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={submit} className={styles.form}>
          <Field label="Имейл">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Парола">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </Field>

          {error && <div className={styles.error}>{error}</div>}
          {info && <div className={styles.info}>{info}</div>}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Влез' : 'Регистрирай се'}
          </button>
        </form>
      </div>
    </div>
  )
}
