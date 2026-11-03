import { useState, useEffect } from 'react'
import './App.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'
import Login from './login'

const doBanco = (r) => ({
  id: r.id,
  numero: `O.S-${String(r.numero_seq).padStart(3, '0')}`,
  dataEmissao: r.data_emissao,
  emitidoPor: r.emitente?.nome || '',
  cliente: r.cliente,
  veiculo: r.veiculo || '',
  placa: r.placa,
  km: r.km || '',
  reclamacao: r.reclamacao || '',
  servicoExecutado: r.servico_executado || '',
  observacoes: r.observacoes || '',
  maoDeObra: r.mao_de_obra,
  pecas: r.pecas || []
})

const formatarData = (valor) => {
  if (!valor) return '-'

  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T00:00:00`)
    : new Date(valor)

  return data.toLocaleDateString('pt-BR')
}

const calcularTotalPecas = (pecas) =>
  pecas.reduce(
    (total, peca) =>
      total +
      Number(peca.quantidade) *
      Number(peca.valorUnitario),
    0
  )

function App() {

  const [idEdicao, setIdEdicao] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [novaOS, setNovaOS] = useState(false)
  const [pecas, setPecas] = useState([])
  const [maoDeObra, setMaoDeObra] = useState(0)
  const [ordemSelecionada, setOrdemSelecionada] = useState(null)
  const [ordens, setOrdens] = useState([])
 const [servicoExecutado, setServicoExecutado] = useState('')
 const [observacoes, setObservacoes] = useState('')

const [sessao, setSessao] = useState(null)
const [verificandoSessao, setVerificandoSessao] = useState(true)

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSessao(data.session)
    setVerificandoSessao(false)
  })

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_evento, novaSessao) => {
      setSessao(novaSessao)
    }
  )

  return () => listener.subscription.unsubscribe()
}, [])

const carregarOrdens = async () => {
  const { data, error } = await supabase
    .from('ordens')
    .select('*, emitente:perfis(nome)')
    .order('numero_seq', { ascending: false })

  if (error) {
    alert('Erro ao carregar as O.S.')
    console.error(error)
    return
  }

  setOrdens(data.map(doBanco))
}

useEffect(() => {
  if (sessao) carregarOrdens()
}, [sessao])

const dadosEmpresa = {
  nome: 'OFICINA EXEMPLO',
  subtitulo: 'PRESTAÇÃO DE SERVIÇOS AUTOMOTIVOS',
  endereco: 'Rua Exemplo, 123 - Centro, Cidade - UF',
  cep: '00000-000',
  telefone: '(00) 00000-0000',
  cnpj: '00.000.000/0000-00'
}

const carregarLogo = async () => {
  const resposta = await fetch('/logo.png')
  const blob = await resposta.blob()

  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      resolve(reader.result)
    }

    reader.readAsDataURL(blob)
  })
}

const gerarOS = async (ordem) => {
  const pdf = new jsPDF()

  const logo = await carregarLogo()

  pdf.addImage(logo, 'PNG', 155, 10, 35, 35)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text(dadosEmpresa.nome, 20, 20)

  pdf.setFontSize(10)
  pdf.text(dadosEmpresa.subtitulo, 20, 27)

  pdf.setFont('helvetica', 'normal')
  pdf.text(dadosEmpresa.endereco, 20, 35)
  pdf.text(`CEP: ${dadosEmpresa.cep}`, 20, 41)
  pdf.text(`Fone: ${dadosEmpresa.telefone}`, 20, 47)
  pdf.text(`CNPJ: ${dadosEmpresa.cnpj}`, 20, 53)

  const totalPecas = calcularTotalPecas(ordem.pecas)

const totalOS =
  totalPecas + Number(ordem.maoDeObra)

pdf.line(10, 58, 200, 58)

pdf.setFont('helvetica', 'bold')
pdf.setFontSize(14)

pdf.text(
  `ORDEM DE SERVIÇO - ${ordem.numero}`,
  105,
  67,
  { align: 'center' }
)

pdf.line(10, 74, 200, 74)

pdf.setFont('helvetica', 'normal')
pdf.setFontSize(10)

pdf.text(`Cliente: ${ordem.cliente || ''}`, 12, 82)
pdf.line(10, 85, 200, 85)

pdf.text(`KM: ${ordem.km || ''}`, 12, 92)
pdf.text(`Veículo: ${ordem.veiculo || ''}`, 75, 92)

pdf.line(10, 95, 200, 95)

pdf.text(`Placa: ${ordem.placa || ''}`, 12, 102)
pdf.text(`Data de emissão: ${formatarData(ordem.dataEmissao)}`, 75, 102)

pdf.line(10, 105, 200, 105)

const linhasPecas = ordem.pecas.map((peca) => [
  String(peca.quantidade),
  peca.descricao,
  formatarMoeda(peca.valorUnitario),
  formatarMoeda(
    Number(peca.quantidade) *
    Number(peca.valorUnitario)
  )
])

autoTable(pdf, {
  startY: 105,
  head: [[
    'Qtde.',
    'Descrição',
    'Valor unit.',
    'Total'
  ]],
  body: linhasPecas,
  margin: {
    left: 10,
    right: 10
  },
  styles: {
    fontSize: 9,
    lineWidth: 0.2,
    lineColor: 0,
    cellPadding: 2
  },
  headStyles: {
    fillColor: [230, 230, 230],
    textColor: 0,
    fontStyle: 'bold',
    halign: 'center'
  }
})

let y = pdf.lastAutoTable.finalY + 8

// altura do bloco dos totais até o fim do quadro de observações
const alturaBlocoFinal = 116

if (y + alturaBlocoFinal > 250) {
  pdf.addPage()
  y = 20
}

pdf.setFont('helvetica', 'normal')
pdf.setFontSize(10)

pdf.text(
  `Total das peças: ${formatarMoeda(totalPecas)}`,
  195,
  y,
  { align: 'right' }
)

y += 7

pdf.text(
  `Mão de obra: ${formatarMoeda(ordem.maoDeObra)}`,
  195,
  y,
  { align: 'right' }
)

y += 9

pdf.setFont('helvetica', 'bold')
pdf.setFontSize(13)

pdf.text(
  `TOTAL GERAL: ${formatarMoeda(totalOS)}`,
  195,
  y,
  { align: 'right' }
)

y += 12

pdf.setFontSize(10)
pdf.setFont('helvetica', 'bold')
pdf.text('RECLAMAÇÃO DO CLIENTE', 12, y)

y += 4

pdf.rect(10, y, 190, 24)

pdf.setFont('helvetica', 'normal')

const textoReclamacao = pdf.splitTextToSize(
  ordem.reclamacao || '',
  180
)

pdf.text(
  textoReclamacao,
  14,
  y + 6
)

y += 30

pdf.setFont('helvetica', 'bold')
pdf.text('SERVIÇO EXECUTADO', 12, y)

y += 4

pdf.rect(10, y, 190, 30)

pdf.setFont('helvetica', 'normal')

const textoServico = pdf.splitTextToSize(
  ordem.servicoExecutado || '',
  180
)

pdf.text(
  textoServico,
  14,
  y + 6
)

y += 36

pdf.setFont('helvetica', 'bold')
pdf.text('OBSERVAÇÕES', 12, y)

y += 4

pdf.rect(10, y, 190, 10)

pdf.setFont('helvetica', 'normal')

pdf.text(
  pdf.splitTextToSize(ordem.observacoes || '', 180)[0] || '',
  14,
  y + 6.5
)

pdf.rect(110, 255, 80, 20)

pdf.setFontSize(9)

pdf.text(
  'Assinatura do cliente',
  150,
  269,
  { align: 'center' }
)

pdf.setFont('helvetica', 'bold')

pdf.text(
  'TODO ORÇAMENTO ESTARÁ SUJEITO A ALTERAÇÃO',
  105,
  284,
  { align: 'center' }
)

  pdf.save(`${ordem.numero}.pdf`)
}
  
  const [cliente, setCliente] = useState('')
  const [veiculo, setVeiculo] = useState('')
  const [placa, setPlaca] = useState('')
  const [km, setKm] = useState('')
  const [reclamacao, setReclamacao] = useState('')

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const resetarFormulario = () => {
    setCliente('')
    setVeiculo('')
    setPlaca('')
    setKm('')
    setReclamacao('')
    setServicoExecutado('')
    setObservacoes('')
    setPecas([])
    setMaoDeObra(0)
    setIdEdicao(null)
  }

  const atualizarPeca = (index, campo, valor) => {
  setPecas(
    pecas.map((peca, i) =>
      i === index
        ? { ...peca, [campo]: valor }
        : peca
    )
  )
}

if (verificandoSessao) {
  return <main><p>Carregando...</p></main>
}

if (!sessao) {
  return <Login />
}

if (ordemSelecionada) {
  const totalPecas = calcularTotalPecas(ordemSelecionada.pecas)

  const totalOS =
    totalPecas + Number(ordemSelecionada.maoDeObra)

  return (
    <main>
     <button
  type="button"
  onClick={() => setOrdemSelecionada(null)}
>
  ← Voltar
</button>

      <h1>{ordemSelecionada.numero}</h1>

      <section>
        <p>
          <strong>Data:</strong> {formatarData(ordemSelecionada.dataEmissao)}
        </p>

        <p>
          <strong>Emitida por:</strong> {ordemSelecionada.emitidoPor || '-'}
        </p>

        <p>
          <strong>Cliente:</strong> {ordemSelecionada.cliente}
        </p>

        <p>
          <strong>Veículo:</strong> {ordemSelecionada.veiculo}
        </p>

        <p>
          <strong>Placa:</strong> {ordemSelecionada.placa}
        </p>

        <p>
          <strong>KM:</strong> {ordemSelecionada.km}
        </p>

        <p>
          <strong>Reclamação:</strong> {ordemSelecionada.reclamacao}
        </p>
        <p>
  <strong>Serviço executado:</strong>{' '}
  {ordemSelecionada.servicoExecutado || '-'}
</p>
        <p>
          <strong>Observações:</strong> {ordemSelecionada.observacoes || '-'}
        </p>
      </section>

        <button
          type="button"
          onClick={() => {
            setIdEdicao(ordemSelecionada.id)

            setCliente(ordemSelecionada.cliente)
setVeiculo(ordemSelecionada.veiculo)
setPlaca(ordemSelecionada.placa)
setKm(ordemSelecionada.km)
setReclamacao(ordemSelecionada.reclamacao)

setServicoExecutado(
  ordemSelecionada.servicoExecutado || ''
)
setObservacoes(ordemSelecionada.observacoes || '')

setPecas(ordemSelecionada.pecas)
setMaoDeObra(ordemSelecionada.maoDeObra)

            setOrdemSelecionada(null)
            setNovaOS(true)
          }}
        >
          Editar O.S.
        </button>

      <section>
        <h2>Peças</h2>

        {ordemSelecionada.pecas.length === 0 ? (
          <p>Nenhuma peça cadastrada.</p>
        ) : (
          ordemSelecionada.pecas.map((peca, index) => (
            <div key={index}>
              <strong>{peca.descricao}</strong>

              <p>
                Quantidade: {peca.quantidade}
              </p>

              <p>
                Valor unitário: {formatarMoeda(
                  peca.valorUnitario
                )}
              </p>
            

              <p>
                Subtotal: {formatarMoeda(
                  Number(peca.quantidade) *
                  Number(peca.valorUnitario)
                )}
              </p>
            </div>
          ))
        )}

        <h3>
          Total das peças: {formatarMoeda(totalPecas)}
        </h3>
      </section>

    <section>
  <p>
    <strong>Mão de obra:</strong>{' '}
    {formatarMoeda(ordemSelecionada.maoDeObra)}
  </p>

  <h2>
    Total da O.S.: {formatarMoeda(totalOS)}
  </h2>
</section>

<button
  type="button"
  onClick={() => gerarOS(ordemSelecionada)}
>
  Gerar O.S.
</button>

<button
  type="button"
  onClick={async () => {
    const confirmar = window.confirm(
      `Deseja realmente excluir a ${ordemSelecionada.numero}?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('ordens')
      .delete()
      .eq('id', ordemSelecionada.id)

    if (error) {
      alert('Erro ao excluir a O.S.')
      console.error(error)
      return
    }

    await carregarOrdens()
    setOrdemSelecionada(null)
  }}
>
  
  Excluir O.S.
</button>

</main>
)
}



if (novaOS) {
    return (
      <main>
        <button
  type="button"
  onClick={() => {
    resetarFormulario()
    setNovaOS(false)
  }}
>
  ← Voltar
</button>

        <h1>Nova Ordem de Serviço</h1>

        <form
        onSubmit={async (e) => {
        e.preventDefault()

        if (salvando) return

        if (!cliente.trim() || !placa.trim()) {
          alert('Preencha o cliente e a placa.')
          return
        }

        const registro = {
          cliente,
          veiculo,
          placa,
          km: km === '' ? null : km,
          reclamacao,
          servico_executado: servicoExecutado,
          observacoes,
          mao_de_obra: Number(maoDeObra) || 0,
          pecas
        }

        setSalvando(true)

        const { error } = idEdicao !== null
          ? await supabase
              .from('ordens')
              .update(registro)
              .eq('id', idEdicao)
          : await supabase
              .from('ordens')
              .insert(registro)

        setSalvando(false)

        if (error) {
          alert('Erro ao salvar a O.S.')
          console.error(error)
          return
        }

        await carregarOrdens()
        resetarFormulario()
        setNovaOS(false)
  }}
>
          <label>Cliente</label>
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />

          <label>Veículo</label>
          <input
            type="text"
            value={veiculo}
            onChange={(e) => setVeiculo(e.target.value)}
          />

          <label>Placa</label>
          <input
            type="text"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
          />

          <label>KM</label>
          <input
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />

          <label>Reclamação do cliente</label>
          <textarea
            value={reclamacao}
            onChange={(e) => setReclamacao(e.target.value)}
          />
          <label>Serviço executado</label>

          <textarea
           value={servicoExecutado}
           onChange={(e) => setServicoExecutado(e.target.value)}
          />

          <label>Observações</label>
          <input
            type="text"
            maxLength={80}
            placeholder="Ex.: número de aprovação"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />

          <h3>Peças</h3>

{pecas.map((peca, index) => (
  <div key={index}>
    <input
      type="text"
      placeholder="Descrição da peça"
      value={peca.descricao}
      onChange={(e) => atualizarPeca(index, 'descricao', e.target.value)}
    />

    <input
      type="number"
      placeholder="Quantidade"
      value={peca.quantidade}
      onChange={(e) => atualizarPeca(index, 'quantidade', e.target.value)}
    />
      

    <input
      type="number"
      placeholder="Valor unitário"
      value={peca.valorUnitario}
     onChange={(e) => atualizarPeca(index, 'valorUnitario', e.target.value)}
    />

  <p>
  Subtotal: {formatarMoeda(
    Number(peca.quantidade) * Number(peca.valorUnitario)
  )}
</p>
  <button
  type="button"
  onClick={() => {
    const novasPecas = pecas.filter((_, i) => i !== index)
    setPecas(novasPecas)
  }}
>
  Remover peça
</button>

   </div>
))}

<h3>
  Total das peças: {formatarMoeda(calcularTotalPecas(pecas))}
</h3>

<label>Mão de obra</label>

<input
  type="number"
  placeholder="Valor da mão de obra"
  value={maoDeObra}
  onChange={(e) => setMaoDeObra(e.target.value)}
/>

<h2>
  Total da O.S.: {formatarMoeda(
    calcularTotalPecas(pecas) + Number(maoDeObra)
  )}
</h2>

<button
  type="button"
  onClick={() =>
    setPecas([
      ...pecas,
      {
        descricao: '',
        quantidade: 1,
        valorUnitario: 0
      }
    ])
  }
>
  + Adicionar peça
</button>

          <button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar O.S.'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main>
      <img
        src="/logo.png"
        alt="Logo da Oficina Exemplo"
        className="logo"
      />

      <h1>Oficina Exemplo</h1>
      <h2>Sistema de Ordens de Serviço</h2>

      <button onClick={() => setNovaOS(true)}>
        + Nova O.S.
      </button>

      <section>
        <h3>Ordens de Serviço</h3>
        {ordens.length === 0 ? (
  <p>Nenhuma ordem cadastrada ainda.</p>
) : (
 ordens.map((ordem) => (
  <div
    key={ordem.id}
    onClick={() => setOrdemSelecionada(ordem)}
    className="ordem-card"
  >
    <strong>{ordem.numero}</strong>
    <p>Data: {formatarData(ordem.dataEmissao)}</p>
    <p>Emitida por: {ordem.emitidoPor || '-'}</p>
    <p>Cliente: {ordem.cliente}</p>
    <p>Veículo: {ordem.veiculo}</p>
    <p>Placa: {ordem.placa}</p>
  </div>
))
)}
      </section>
    </main>
  )
}

export default App