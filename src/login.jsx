import { useState } from 'react'
import { supabase } from './supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })

    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha incorretos.')
    }
  }

  return (
    <main>
      <img
        src="/logo.png"
        alt="Logo da Oficina Exemplo"
        className="logo"
      />

      <h1>Oficina Exemplo</h1>
      <h2>Entre para acessar as ordens de serviço</h2>

      <form onSubmit={entrar}>
        <label>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />

        {erro && <p style={{ color: '#b91c1c' }}>{erro}</p>}

        <button type="submit" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

export default Login