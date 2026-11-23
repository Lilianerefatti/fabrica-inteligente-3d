import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// A simulação continua funcionando mesmo se o navegador bloquear o armazenamento local.
let avisoArmazenamentoExibido = false;
function lerArmazenamento(chave) {
  try {
    return window.localStorage.getItem(chave);
  } catch (erro) {
    if (!avisoArmazenamentoExibido) {
      console.warn("O armazenamento local está indisponível; a simulação continuará sem persistência.", erro);
      avisoArmazenamentoExibido = true;
    }
    return null;
  }
}

function gravarArmazenamento(chave, valor) {
  try {
    window.localStorage.setItem(chave, valor);
    return true;
  } catch (erro) {
    if (!avisoArmazenamentoExibido) {
      console.warn("Não foi possível salvar os dados locais; a simulação continuará sem persistência.", erro);
      avisoArmazenamentoExibido = true;
    }
    return false;
  }
}

function removerArmazenamento(chave) {
  try {
    window.localStorage.removeItem(chave);
  } catch (erro) {
    if (!avisoArmazenamentoExibido) {
      console.warn("Não foi possível limpar os dados locais.", erro);
      avisoArmazenamentoExibido = true;
    }
  }
}

const scene = new THREE.Scene();
const pallets = [];
scene.background = new THREE.Color("#dce7ee");

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(12, 11, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;

function ajustarEnquadramento() {
  if (window.innerHeight > window.innerWidth) {
    camera.position.set(28, 25, 34);
  } else {
    camera.position.set(12, 11, 15);
  }

  controls.update();
}

ajustarEnquadramento();

// Iluminação
scene.add(new THREE.HemisphereLight(0xffffff, 0x788794, 2));

const luz = new THREE.DirectionalLight(0xffffff, 2.5);
luz.position.set(-8, 15, 10);
luz.castShadow = true;
scene.add(luz);

// Piso e linhas de referência
const piso = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 18),
  new THREE.MeshStandardMaterial({ color: "#e8edf0" })
);
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
scene.add(piso);

const grade = new THREE.GridHelper(24, 24, "#aebec9", "#d1dbe1");
grade.position.y = 0.02;
scene.add(grade);

// Função para criar caixas e partes das estantes
function bloco(largura, altura, profundidade, cor, x, y, z) {
  const objeto = new THREE.Mesh(
    new THREE.BoxGeometry(largura, altura, profundidade),
    new THREE.MeshStandardMaterial({ color: cor })
  );

  objeto.position.set(x, y, z);
  objeto.castShadow = true;
  objeto.receiveShadow = true;
  scene.add(objeto);

  return objeto;
}

// Estante com três níveis e caixas
function criarEstante(x, z) {
  const montante = "#d88932";
  const viga = "#e7aa4d";
  const niveis = [0.75, 1.95, 3.15];
  const coresCaixas = ["#42a66d", "#e6b533", "#d65a4a"];

  for (const deslocamentoX of [-1.7, 1.7]) {
    for (const deslocamentoZ of [-0.65, 0.65]) {
      bloco(
        0.12, 3.8, 0.12, montante,
        x + deslocamentoX, 1.9, z + deslocamentoZ
      );
    }
  }

  niveis.forEach((altura, indice) => {
    for (const deslocamentoZ of [-0.65, 0.65]) {
      bloco(
        3.5, 0.12, 0.12, viga,
        x, altura, z + deslocamentoZ
      );
    }

    for (const deslocamentoX of [-0.9, 0.9]) {
      for (const deslocamentoZ of [-0.32, 0.32]) {
       const indicePosicao = deslocamentoX < 0 ? 0 : 1;

        const numero = pallets.length + 1;
        const validade = [18, 86, 140][(numero - 1) % 3];

        const cor =
            validade <= 30 ? "#e4574f" :
            validade <= 90 ? "#f2bd3d" :
            "#41a66d";

        const pallet = bloco(
            1.25, 0.65, 0.55, cor,
            x + deslocamentoX, altura + 0.38, z + deslocamentoZ
        );

        const area = x < 0 ? "A" : x === 0 ? "B" : "C";

        pallet.userData = {
            id: `PA-${String(numero).padStart(3, "0")}`,
            endereco: `${area}-${indice + 1}-${indicePosicao + 1}-${deslocamentoZ < 0 ? "F" : "T"}`,
            produto: ["Suco de uva 1 L", "Suco de laranja 1 L", "Água saborizada 500 ml"][(numero - 1) % 3],
            lote: `LOTE-2026-${String(numero).padStart(3, "0")}`,
            caixas: 480,
            validade: validade
        };

        pallets.push(pallet);
      }
    }
  });
}

criarEstante(-5, -2);
criarEstante(0, -2);
criarEstante(5, -2);

function criarEtiqueta(texto, x, y, z, largura =2.8, altura = 0.7) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const contexto = canvas.getContext("2d");
  contexto.fillStyle = "rgba(36, 56, 75, 0.9)";
  contexto.beginPath();
  contexto.roundRect(8, 8, 496, 112, 18);
  contexto.fill();

  contexto.fillStyle = "#ffffff";
  contexto.font = "bold 48px Arial";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(texto, 256, 64);

  const textura = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: textura,
    transparent: true
  });

  const etiqueta = new THREE.Sprite(material);
  etiqueta.position.set(x, y, z);
  etiqueta.scale.set(largura, altura, 1);
  scene.add(etiqueta);
}

criarEtiqueta("BLOCO A", -5, 4.3, -1.2, 2.0, 0.5);
criarEtiqueta("BLOCO B", 0, 4.3, -1.2, 2.0, 0.5);
criarEtiqueta("BLOCO C", 5, 4.3, -1.2, 2.0, 0.5);

bloco(5.0, 0.035, 5.5, "#dce9df", 9.4, 0.03, -3.8);
criarEtiqueta("PALETES PRONTOS", 9.4, 2.4, -3.8, 2.6, 0.5);
bloco(4.2, 0.035, 2.5, "#d5e0e5", 9.4, 0.025, -7.0);
criarEtiqueta("DOCA DE EXPEDIÇÃO", 8.4, 2.1, -7.0, 2.8, 0.5);

function criarCaminhao() {
  const grupo = new THREE.Group();
  const carroceria = new THREE.MeshStandardMaterial({ color: "#2874a6", roughness: 0.8 });
  const cabine = new THREE.MeshStandardMaterial({ color: "#3498db", roughness: 0.7 });
  const vidro = new THREE.MeshStandardMaterial({ color: "#b9dce8", roughness: 0.4 });
  const escuro = new THREE.MeshStandardMaterial({ color: "#263746", roughness: 0.9 });
  const pneu = new THREE.MeshStandardMaterial({ color: "#202a30", roughness: 0.9 });

  function peca(geometria, material, x, y, z) {
    const mesh = new THREE.Mesh(geometria, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    grupo.add(mesh);
    return mesh;
  }

  peca(new THREE.BoxGeometry(3.3, 0.25, 1.5), escuro, 0, 0.45, 0);
  peca(new THREE.BoxGeometry(2.15, 0.28, 1.5), carroceria, -0.45, 0.68, 0);
  peca(new THREE.BoxGeometry(1.05, 1.05, 1.5), cabine, 1.15, 1.05, 0);
  peca(new THREE.BoxGeometry(0.06, 0.58, 1.08), vidro, 1.69, 1.18, 0);

  for (const x of [-1.0, 0.95]) {
    for (const z of [-0.82, 0.82]) {
      const roda = peca(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 16), pneu, x, 0.25, z);
      roda.rotation.x = Math.PI / 2;
    }
  }

  scene.add(grupo);
  grupo.position.set(8.4, 0, -7.0);
  return { grupo, cargas: [], estado: "parado", velocidade: 3.2 };
}

const caminhao = criarCaminhao();

const vagasBufferPaletes = [5.6, 6.65, 7.7, 8.75];
const vagasPaletesProntos = [7.8, 8.8, 9.8, 10.8];
const palletsProntos = [];
const chaveHistoricoPallets = "fabricaInteligente.historicoPallets.v1";
// O histórico fica salvo no navegador; itens em trânsito ao recarregar são marcados como interrompidos.
const registrosPalletsProducao = carregarHistoricoPallets();
const palletsProducaoEmCena = new Set();
let totalPalletsExpedidos = 0;
let totalPacotesProduzidos = 0;
let totalPalletsMontados = registrosPalletsProducao.reduce((maior, registro) => {
  const sequencia = Number(String(registro.id || "").match(/PP-(\d+)/)?.[1] || 0);
  return Math.max(maior, sequencia);
}, 0);
let simulacaoPausada = false;
let velocidadeSimulacao = 1;
let tempoSimulado = 0;

const painelOperacao = document.createElement("section");
painelOperacao.id = "painelOperacaoAoVivo";
painelOperacao.style.cssText = [
  "position:fixed", "top:145px", "left:50%", "transform:translateX(-50%)", "z-index:20",
  "width:min(420px, calc(100vw - 24px))", "max-height:calc(100vh - 160px)",
  "overflow:auto", "box-sizing:border-box", "padding:10px 12px",
  "border-radius:12px", "background:rgba(255,255,255,.96)",
  "box-shadow:0 5px 16px rgba(30,50,65,.2)",
  "color:#24384b", "font:13px Arial,sans-serif"
].join(";");
painelOperacao.innerHTML = `
  <details id="painelOperacaoDetalhes">
    <summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;font-weight:700">
      <span>Operação em tempo real</span><span id="resumoOperacao" style="font-size:11px;font-weight:400">0 caixas · 0 pallets expedidos</span>
    </summary>
    <div style="padding-top:10px">
      <p style="margin:0 0 8px;font-size:11px;color:#536779">Métricas da sessão atual; rastreamento de pallets salvo neste navegador e separado do estoque cadastrado.</p>
      <div style="display:flex;gap:6px;margin:0 0 10px;flex-wrap:wrap">
        <button id="controlePausa" type="button">Pausar</button>
        <label style="display:flex;align-items:center;gap:5px">Velocidade
          <select id="velocidadeSimulacao" aria-label="Velocidade da simulação">
            <option value="1">1×</option><option value="1.5">1,5×</option><option value="2">2×</option>
          </select>
        </label>
        <button id="reiniciarSimulacao" type="button">Reiniciar simulação</button>
        <button id="exportarHistoricoPalletsCSV" type="button">Exportar rastreamento CSV</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <div class="metricaAoVivo"><strong id="metricasCaixasProduzidas">0</strong><span>caixas produzidas</span></div>
        <div class="metricaAoVivo"><strong id="metricasCaixasFluxo">0</strong><span>caixas em fluxo</span></div>
        <div class="metricaAoVivo"><strong id="metricasPalletsProntos">0</strong><span>pallets prontos</span></div>
        <div class="metricaAoVivo"><strong id="metricasPalletsExpedidos">0</strong><span>pallets expedidos</span></div>
      </div>
      <details style="margin-top:11px">
        <summary style="cursor:pointer;font-weight:700">Histórico da operação</summary>
        <ol id="historicoOperacao" style="margin:8px 0 0;padding-left:22px;max-height:170px;overflow:auto"></ol>
      </details>
    </div>
  </details>
`;
const estiloPainelAoVivo = document.createElement("style");
estiloPainelAoVivo.textContent = `
  #painelOperacaoAoVivo button,#painelOperacaoAoVivo select{font:inherit;color:#24384b;border:1px solid #c7d4de;border-radius:6px;background:#fff;padding:6px 8px}
  #painelOperacaoAoVivo button{cursor:pointer;font-weight:600}
  #painelOperacaoAoVivo button:hover{background:#edf3f7}
  #painelOperacaoDetalhes>summary{list-style:none}
  #painelOperacaoDetalhes>summary::-webkit-details-marker{display:none}
  #painelOperacaoAoVivo .metricaAoVivo{padding:8px;border-radius:8px;background:#f1f5f8;display:flex;flex-direction:column;gap:3px}
  #painelOperacaoAoVivo .metricaAoVivo strong{font-size:18px}
  #painelOperacaoAoVivo .metricaAoVivo span,#historicoOperacao{font-size:11px}
  #historicoOperacao li{padding:4px 0;border-bottom:1px solid #e5ebef;line-height:1.35}
`;
document.head.appendChild(estiloPainelAoVivo);
document.body.appendChild(painelOperacao);

const painelOperacaoDetalhes = document.getElementById("painelOperacaoDetalhes");
if (window.innerHeight > window.innerWidth) {
  painelOperacaoDetalhes.open = false;
}

function carregarHistoricoPallets() {
  try {
    const salvo = JSON.parse(lerArmazenamento(chaveHistoricoPallets) || "[]");
    if (!Array.isArray(salvo)) return [];
    return salvo.map((registro) => {
      const item = { ...registro };
      item.historicoRastreamento = Array.isArray(item.historicoRastreamento)
        ? item.historicoRastreamento
        : [];
      if (item.statusOperacional !== "Expedido") {
        item.statusOperacional = "Interrompido ao recarregar";
        item.endereco = "Simulação anterior interrompida ao recarregar";
        item.historicoRastreamento.push({
          status: item.statusOperacional,
          endereco: item.endereco,
          dataHora: new Date().toISOString()
        });
      }
      return item;
    });
  } catch (erro) {
    console.warn("Não foi possível recuperar o histórico dos pallets.", erro);
    return [];
  }
}

function salvarHistoricoPallets() {
  const camposPersistidos = registrosPalletsProducao.map((registro) => ({
    id: registro.id,
    lote: registro.lote,
    endereco: registro.endereco,
    produto: registro.produto,
    linhasOrigem: registro.linhasOrigem,
    caixas: registro.caixas,
    validade: registro.validade,
    tipo: "palletProducao",
    statusOperacional: registro.statusOperacional,
    criadoEm: registro.criadoEm,
    historicoRastreamento: registro.historicoRastreamento || []
  }));
  try {
    gravarArmazenamento(chaveHistoricoPallets, JSON.stringify(camposPersistidos));
  } catch (erro) {
    console.warn("Não foi possível salvar o histórico dos pallets.", erro);
  }
}

function exportarHistoricoPalletsCSV() {
  if (!registrosPalletsProducao.length) {
    registrarEvento("Ainda não há pallets simulados para exportar.");
    return;
  }
  const colunas = ["ID", "Lote", "Produto", "Caixas", "Linha de origem", "Status", "Localização atual", "Trajeto", "Criado em"];
  const escapar = (valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`;
  const linhas = registrosPalletsProducao.map((registro) => [
    registro.id,
    registro.lote,
    registro.produto,
    registro.caixas,
    registro.linhasOrigem,
    registro.statusOperacional,
    registro.endereco,
    (registro.historicoRastreamento || []).map((etapa) => etapa.endereco).join(" → "),
    registro.criadoEm
  ].map(escapar).join(";"));
  const arquivo = new Blob(["\uFEFF", [colunas.map(escapar).join(";"), ...linhas].join("\r\n")], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rastreamento-pallets-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  registrarEvento(`CSV exportado com ${registrosPalletsProducao.length} registros de pallets.`);
}

if (registrosPalletsProducao.length) salvarHistoricoPallets();

function encontrarCardPorTexto(...trechos) {
  const candidatos = [...document.querySelectorAll("body div, body section, body aside")]
    .filter((elemento) => {
      const texto = elemento.textContent.toLowerCase();
      return trechos.every((trecho) => texto.includes(trecho.toLowerCase()));
    });
  return candidatos.sort((a, b) => a.textContent.length - b.textContent.length)[0] || null;
}

function encontrarCardFixo(elemento) {
  let atual = elemento;
  while (atual && atual !== document.body) {
    const estilo = getComputedStyle(atual);
    const pareceCard = estilo.boxShadow !== "none" && estilo.borderRadius !== "0px";
    if (estilo.position === "fixed" || pareceCard) return atual;
    atual = atual.parentElement;
  }
  return elemento;
}

const painelAlertas = document.getElementById("painelAlertas");
const tituloDetalhes = document.getElementById("tituloDetalhes");
const painelDetalhes = tituloDetalhes ? encontrarCardFixo(tituloDetalhes) : null;
const painelLegendas = encontrarCardPorTexto("Validade dos produtos", "Status da produção");
const campoValidade = document.getElementById("validade");
if (campoValidade?.parentElement) {
  campoValidade.parentElement.insertAdjacentHTML("afterend", `
    <p id="situacaoProducaoPallet" hidden><strong>Status:</strong> <span></span></p>
    <p id="origemProducaoPallet" hidden><strong>Linha de origem:</strong> <span></span></p>
    <p id="trajetoProducaoPallet" hidden><strong>Rastreamento:</strong> <span></span></p>
  `);
}

function ajustarPosicaoDosPaineis() {
  if (painelAlertas) {
    const caixaAlertas = painelAlertas.getBoundingClientRect();
    const largura = Math.min(caixaAlertas.width, window.innerWidth - 24);
    painelOperacao.style.top = `${Math.min(caixaAlertas.bottom + 8, window.innerHeight - 60)}px`;
    painelOperacao.style.left = `${Math.max(12, caixaAlertas.left)}px`;
    painelOperacao.style.right = "auto";
    painelOperacao.style.transform = "none";
    painelOperacao.style.width = `${largura}px`;
    painelOperacao.style.maxHeight = `${Math.max(120, window.innerHeight - caixaAlertas.bottom - 24)}px`;
  }

  if (painelDetalhes && painelLegendas) {
    const caixaDetalhes = painelDetalhes.getBoundingClientRect();
    painelLegendas.style.position = "fixed";
    painelLegendas.style.top = `${Math.min(caixaDetalhes.bottom + 10, window.innerHeight - 100)}px`;
    painelLegendas.style.right = `${Math.max(8, window.innerWidth - caixaDetalhes.right)}px`;
    painelLegendas.style.left = "auto";
    painelLegendas.style.bottom = "auto";
    painelLegendas.style.width = `${Math.min(caixaDetalhes.width, window.innerWidth - 16)}px`;
    painelLegendas.style.boxSizing = "border-box";
  }
}

requestAnimationFrame(ajustarPosicaoDosPaineis);
window.addEventListener("resize", ajustarPosicaoDosPaineis);
if (typeof ResizeObserver !== "undefined") {
  const observadorPaineis = new ResizeObserver(ajustarPosicaoDosPaineis);
  if (painelAlertas) observadorPaineis.observe(painelAlertas);
  if (painelDetalhes) observadorPaineis.observe(painelDetalhes);
}

const camposMetricas = {
  produzidas: document.getElementById("metricasCaixasProduzidas"),
  fluxo: document.getElementById("metricasCaixasFluxo"),
  prontas: document.getElementById("metricasPalletsProntos"),
  expedidas: document.getElementById("metricasPalletsExpedidos")
};

const totalPallets = pallets.length;

const quantidadeCritica = pallets.filter(
  (pallet) => pallet.userData.validade <= 30
).length;

const totalCaixas = pallets.reduce(
  (total, pallet) => total + pallet.userData.caixas,
  0
);

document.getElementById("totalPallets").textContent =
  totalPallets.toLocaleString("pt-BR");

document.getElementById("palletsCriticos").textContent =
  quantidadeCritica.toLocaleString("pt-BR");

document.getElementById("totalCaixas").textContent =
  totalCaixas.toLocaleString("pt-BR");

document.querySelectorAll("#indicadores .indicador span").forEach((rotulo) => {
  if (rotulo.textContent.trim().toLowerCase() === "caixas em estoque") {
    rotulo.textContent = "caixas cadastradas no estoque";
  }
});

// Máquina demonstrativa
// Linha de produção demonstrativa
bloco(9, 0.22, 0.9, "#374b59", 0, 0.18, 4.2);
bloco(8.8, 0.06, 0.7, "#a8bbc7", 0, 0.32, 4.2);

const maquinas = [];

const dadosPorLinha = {
  "LINHA 01": {
    produto: "Suco de laranja 1 L",
    responsavel: "Operador A",
    tempoEstado: "2 h 15 min"
  },
  "LINHA 02": {
    produto: "Água saborizada 500 ml",
    responsavel: "Operador B",
    tempoEstado: "35 min"
  },
  "LINHA 03": {
    produto: "Suco de uva 1 L",
    responsavel: "Técnico de manutenção",
    tempoEstado: "50 min"
  }
};

const responsaveisPorStatus = {
  "Produzindo": "Operador de produção",
  "Parada": "Operador da linha",
  "Manutenção": "Técnico de manutenção"
};

function formatarTempoEstado(dataHora) {
  if (!dataHora) return "Não registrado";

  const instante = new Date(dataHora).getTime();
  if (!Number.isFinite(instante)) return "Não registrado";

  const minutos = Math.max(
    0,
    Math.floor((Date.now() - instante) / 60000)
  );

  if (minutos < 1) return "Agora mesmo";

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  return horas > 0
    ? `${horas} h ${minutosRestantes} min`
    : `${minutos} min`;
}

function criarMaquina(nome, estado, x, z) {
  const coresStatus = {
    "Produzindo": "#35a66f",
    "Parada": "#e4574f",
    "Manutenção": "#f2bd3d"
  };

  const estadoSalvo = lerArmazenamento(`status-${nome}`);
  const estadoAtual = coresStatus[estadoSalvo] ? estadoSalvo : estado;

  const corpo = bloco(
    1.2, 1.1, 1.0, "#637b8d",
    x, 0.75, z
  );

  bloco(
    0.9, 0.15, 0.75, "#a8bbc7",
    x, 1.38, z
  );

  const indicadorStatus = bloco(
    0.18, 0.18, 0.18, coresStatus[estadoAtual],
    x + 0.42, 1.38, z - 0.45
  );

  corpo.userData = {
    tipo: "maquina",
    nome,
    indicadorStatus,
    ...dadosPorLinha[nome],
    estado: estadoAtual,
    responsavel: estadoSalvo
      ? responsaveisPorStatus[estadoAtual]
      : dadosPorLinha[nome].responsavel,
    tempoEstado: estadoSalvo
      ? formatarTempoEstado(lerArmazenamento(`statusDesde-${nome}`))
      : dadosPorLinha[nome].tempoEstado
  };

  maquinas.push(corpo);

  criarEtiqueta(nome, x, 2.05, z, 1.8, 0.45);
}

criarMaquina("LINHA 01", "Produzindo", -3, 5.6);
criarMaquina("LINHA 02", "Parada", 0, 5.6);
criarMaquina("LINHA 03", "Manutenção", 3, 5.6);

function atualizarIndicadoresMaquinas() {
  const totalLinhasProduzindo = maquinas.filter(
    (maquina) => maquina.userData.estado === "Produzindo"
  ).length;

  const totalLinhasParadas = maquinas.filter(
    (maquina) => maquina.userData.estado === "Parada"
  ).length;

  const totalLinhasManutencao = maquinas.filter(
    (maquina) => maquina.userData.estado === "Manutenção"
  ).length;

  document.getElementById("linhasProduzindo").textContent =
    `${totalLinhasProduzindo} de ${maquinas.length}`;

  document.getElementById("linhasParadas").textContent =
    totalLinhasParadas;

  document.getElementById("linhasManutencao").textContent =
    totalLinhasManutencao;
}

atualizarIndicadoresMaquinas();
atualizarAlertasOperacionais();

const funcionarios = [];
function criarFuncionario(x, z, corUniforme, amplitude = 0.45, fase = 0) {
  const grupo = new THREE.Group();

  const uniforme = new THREE.MeshStandardMaterial({ color: corUniforme });
  const pele = new THREE.MeshStandardMaterial({ color: "#d8a47f" });
  const capacete = new THREE.MeshStandardMaterial({ color: "#f2bd3d" });
  const calca = new THREE.MeshStandardMaterial({ color: "#34495e" });
  const bota = new THREE.MeshStandardMaterial({ color: "#202a30" });

  function adicionarPeca(geometria, material, px, py, pz, rotacaoZ = 0) {
    const peca = new THREE.Mesh(geometria, material);
    peca.position.set(px, py, pz);
    peca.rotation.z = rotacaoZ;
    peca.castShadow = true;
    peca.receiveShadow = true;
    grupo.add(peca);
    return peca;
  }

  adicionarPeca(new THREE.BoxGeometry(0.42, 0.62, 0.25), uniforme, 0, 1.02, 0);
  adicionarPeca(new THREE.SphereGeometry(0.16, 16, 12), pele, 0, 1.49, 0);
  adicionarPeca(
    new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16),
    capacete, 0, 1.64, 0
  );
  adicionarPeca(
    new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    capacete, 0, 1.66, 0
  );

  const bracoEsquerdo = adicionarPeca(
    new THREE.CylinderGeometry(0.07, 0.08, 0.48, 10),
    uniforme, -0.28, 1.02, 0, 0.35
  );
  const bracoDireito = adicionarPeca(
    new THREE.CylinderGeometry(0.07, 0.08, 0.48, 10),
    uniforme, 0.28, 1.02, 0, -0.35
  );
  const pernaEsquerda = adicionarPeca(
    new THREE.CylinderGeometry(0.08, 0.09, 0.66, 10),
    calca, -0.12, 0.36, 0
  );
  const pernaDireita = adicionarPeca(
    new THREE.CylinderGeometry(0.08, 0.09, 0.66, 10),
    calca, 0.12, 0.36, 0
  );
  adicionarPeca(new THREE.BoxGeometry(0.18, 0.1, 0.28), bota, -0.12, 0.06, 0.06);
  adicionarPeca(new THREE.BoxGeometry(0.18, 0.1, 0.28), bota, 0.12, 0.06, 0.06);

  grupo.position.set(x, 0, z);
  scene.add(grupo);

  return {
    grupo,
    bracoEsquerdo,
    bracoDireito,
    pernaEsquerda,
    pernaDireita,
    xBase: x,
    zBase: z,
    amplitude,
    fase
  };
}

funcionarios.push(criarFuncionario(-4.8, 4.2, "#2874a6", 0.35, 0));
funcionarios.push(criarFuncionario(0, 2.8, "#3b8c61", 0.35, 2));
funcionarios.push(criarFuncionario(7.2, -0.5, "#8e5aa8", 0.3, 4));

function definirRotaFuncionario(funcionario, pontos, velocidade) {
  funcionario.rota = pontos.map(([x, z]) => new THREE.Vector3(x, 0, z));
  funcionario.indiceRota = 0;
  funcionario.velocidadeCaminhada = velocidade;
  funcionario.grupo.position.set(pontos[0][0], 0, pontos[0][1]);
}

// Corredores delimitados fora da esteira, das prateleiras e do trajeto da empilhadeira.
definirRotaFuncionario(funcionarios[0], [
  [-4.8, 3.2], [-3.4, 3.2], [-3.4, 2.3], [-5.2, 2.3]
], 0.55);
definirRotaFuncionario(funcionarios[1], [
  [-1.2, 2.2], [1.2, 2.2], [1.2, 3.1], [-1.2, 3.1]
], 0.5);
definirRotaFuncionario(funcionarios[2], [
  [6.2, 0.5], [7.5, 0.5], [7.5, 1.2], [6.2, 1.2]
], 0.42);

// Empilhadeira demonstrativa que busca pallets na saída da produção.
function criarEmpilhadeira() {
  const grupo = new THREE.Group();
  const rodas = [];
  const laranja = new THREE.MeshStandardMaterial({ color: "#e28b28", roughness: 0.75 });
  const escuro = new THREE.MeshStandardMaterial({ color: "#26343d", roughness: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ color: "#657987", metalness: 0.35, roughness: 0.55 });
  const vidro = new THREE.MeshStandardMaterial({ color: "#9fc5d3", transparent: true, opacity: 0.72 });

  function peca(geometria, material, x, y, z, rotacao = null) {
    const mesh = new THREE.Mesh(geometria, material);
    mesh.position.set(x, y, z);
    if (rotacao) mesh.rotation.set(rotacao.x, rotacao.y, rotacao.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    grupo.add(mesh);
    return mesh;
  }

  peca(new THREE.BoxGeometry(1.05, 0.34, 1.35), laranja, 0, 0.48, -0.12);
  peca(new THREE.BoxGeometry(0.85, 0.72, 0.7), laranja, 0, 0.94, -0.38);
  peca(new THREE.BoxGeometry(0.78, 0.08, 0.7), escuro, 0, 1.34, -0.38);
  peca(new THREE.BoxGeometry(0.72, 0.55, 0.06), vidro, 0, 1.02, -0.05);

  // Mastro e garfos na frente do veículo.
  peca(new THREE.BoxGeometry(0.1, 1.55, 0.12), metal, -0.43, 1.08, 0.58);
  peca(new THREE.BoxGeometry(0.1, 1.55, 0.12), metal, 0.43, 1.08, 0.58);
  peca(new THREE.BoxGeometry(0.95, 0.12, 0.12), metal, 0, 0.48, 0.63);
  peca(new THREE.BoxGeometry(0.12, 0.09, 0.9), metal, -0.27, 0.37, 1.02);
  peca(new THREE.BoxGeometry(0.12, 0.09, 0.9), metal, 0.27, 0.37, 1.02);

  for (const x of [-0.48, 0.48]) {
    for (const z of [-0.55, 0.35]) {
      const roda = peca(
        new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16),
        escuro, x, 0.25, z, { x: 0, y: 0, z: Math.PI / 2 }
      );
      rodas.push(roda);
    }
  }

  scene.add(grupo);
  grupo.position.set(4.8, 0, 5.5);
  grupo.rotation.y = Math.PI;
  return {
    grupo,
    rodas,
    velocidade: 2.2,
    estado: "aguardando",
    rota: [],
    indiceRota: 0,
    carga: null,
    palletAlvo: null,
    vagaBufferReservada: null,
    jaRetornouPeloCanto: false
  };
}

const empilhadeira = criarEmpilhadeira();

// Caixas saem da frente das máquinas em produção e seguem pela esteira.
const produtosEmMovimento = [];
const palletsAguardando = [];
const montagensPalletPorLinha = new Map();
let pacotesNoPallet = 0;

function registrarEvento(descricao) {
  const historico = document.getElementById("historicoOperacao");
  if (!historico) return;
  const item = document.createElement("li");
  const hora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  item.textContent = `${hora} · ${descricao}`;
  historico.prepend(item);
  while (historico.children.length > 8) historico.lastElementChild.remove();
}

function atualizarPainelOperacao() {
  const caixasEmFluxo = produtosEmMovimento.length + pacotesNoPallet +
    palletsAguardando.length * 3 + (empilhadeira.carga ? 3 : 0) +
    palletsProntos.length * 3 + caminhao.cargas.length * 3;
  const valores = {
    produzidas: totalPacotesProduzidos,
    fluxo: caixasEmFluxo,
    prontas: palletsProntos.length,
    expedidas: totalPalletsExpedidos
  };
  for (const [chave, valor] of Object.entries(valores)) {
    const campo = camposMetricas[chave];
    const texto = valor.toLocaleString("pt-BR");
    if (campo.textContent !== texto) campo.textContent = texto;
  }
 document.getElementById("resumoOperacao").textContent =
  `${totalPacotesProduzidos.toLocaleString("pt-BR")} caixas · ${totalPalletsExpedidos.toLocaleString("pt-BR")} pallets expedidos`;
}

document.getElementById("controlePausa").addEventListener("click", (evento) => {
  simulacaoPausada = !simulacaoPausada;
  evento.currentTarget.textContent = simulacaoPausada ? "Retomar" : "Pausar";
  registrarEvento(simulacaoPausada ? "Simulação pausada." : "Simulação retomada.");
});

document.getElementById("velocidadeSimulacao").addEventListener("change", (evento) => {
  velocidadeSimulacao = Number(evento.currentTarget.value);
  registrarEvento(`Velocidade ajustada para ${String(velocidadeSimulacao).replace(".", ",")}×.`);
});

document.getElementById("reiniciarSimulacao").addEventListener("click", () => {
  for (const maquina of maquinas) {
    removerArmazenamento(`status-${maquina.userData.nome}`);
    removerArmazenamento(`statusDesde-${maquina.userData.nome}`);
  }
  removerArmazenamento(chaveHistoricoPallets);
  window.location.reload();
});

document.getElementById("exportarHistoricoPalletsCSV").addEventListener("click", exportarHistoricoPalletsCSV);

registrarEvento("Simulação iniciada. Aguardando saída de caixas das linhas.");

function criarPalletDeProducao() {
  const grupo = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: "#bd8545", roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.82), madeira);
  base.position.y = 0.08;
  base.castShadow = true;
  base.receiveShadow = true;
  grupo.add(base);
  scene.add(grupo);
  return grupo;
}

function adicionarPacoteAoPallet(produto) {
  const linha = produto.maquina.userData.nome;
  const nomeProduto = produto.maquina.userData.produto;
  const chaveMontagem = `${linha}::${nomeProduto}`;
  let montagem = montagensPalletPorLinha.get(chaveMontagem);

  if (!montagem) {
    const vagasOcupadas = new Set([
      ...palletsAguardando.map((pallet) => pallet.userData.vagaBuffer),
      ...[...montagensPalletPorLinha.values()].map((item) => item.vagaBuffer),
      empilhadeira.vagaBufferReservada
    ].filter((vaga) => vaga !== null));
    const vagaBuffer = vagasBufferPaletes.find((vaga) => !vagasOcupadas.has(vaga));
    if (vagaBuffer === undefined) return false;

    const pallet = criarPalletDeProducao();
    pallet.userData = {
      tipo: "palletProducao",
      produto: nomeProduto,
      linhaOrigem: linha,
      linhasOrigem: linha,
      historicoRastreamento: [],
      caixas: 0,
      statusOperacional: "Em montagem",
      endereco: `Buffer ${vagasBufferPaletes.indexOf(vagaBuffer) + 1}`,
      vagaBuffer
    };
    pallet.position.set(vagaBuffer, 0, 4.2);
    montagem = { pallet, quantidade: 0, chave: chaveMontagem, vagaBuffer };
    montagensPalletPorLinha.set(chaveMontagem, montagem);
  }

  scene.remove(produto.grupo);
  montagem.pallet.add(produto.grupo);

  const posicoes = [
    [-0.22, 0.33, 0],
    [0.22, 0.33, 0],
    [0, 0.67, 0]
  ];
  const [x, y, z] = posicoes[montagem.quantidade];
  produto.grupo.position.set(x, y, z);
  produto.grupo.rotation.set(0, 0, 0);
  montagem.quantidade += 1;
  montagem.pallet.userData.caixas += 1;
  pacotesNoPallet += 1;

  if (montagem.quantidade === 3) {
    totalPalletsMontados += 1;
    const pallet = montagem.pallet;
    const dados = pallet.userData;
    dados.id = `PP-${String(totalPalletsMontados).padStart(3, "0")}`;
    dados.lote = `SIM-${dados.id}`;
    dados.validade = null;
    dados.criadoEm = new Date().toISOString();
    registrarEtapaPallet(pallet, "Aguardando coleta", dados.endereco);
    registrosPalletsProducao.push(dados);
    salvarHistoricoPallets();
    palletsProducaoEmCena.add(pallet);
    palletsAguardando.push(pallet);
    montagensPalletPorLinha.delete(chaveMontagem);
    pacotesNoPallet -= 3;
    const numeroVaga = vagasBufferPaletes.indexOf(montagem.vagaBuffer) + 1;
    registrarEvento(`${dados.id} montado com 3 caixas de ${dados.produto}, da ${dados.linhaOrigem}, aguardando no buffer ${numeroVaga}.`);
  }

  return true;
}

function registrarEtapaPallet(pallet, status, endereco) {
  const dados = pallet.userData;
  dados.statusOperacional = status;
  dados.endereco = endereco;
  dados.historicoRastreamento ||= [];
  dados.historicoRastreamento.push({ status, endereco, dataHora: new Date().toISOString() });
  if (dados.id) salvarHistoricoPallets();
}

const coresProdutos = ["#e4574f", "#f2bd3d", "#41a66d"];
let tempoEntreProdutos = 1.5;
let indiceProximaLinha = 0;

function criarProdutoNaEsteira(maquina) {
  const grupo = new THREE.Group();
  const indiceCor = maquinas.indexOf(maquina) % coresProdutos.length;
  const materialCaixa = new THREE.MeshStandardMaterial({
    color: coresProdutos[indiceCor],
    roughness: 0.8
  });
  const materialFita = new THREE.MeshStandardMaterial({ color: "#f5f1df" });

  const caixa = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.34, 0.36),
    materialCaixa
  );
  caixa.castShadow = true;
  caixa.receiveShadow = true;
  grupo.add(caixa);

  const fita = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.012, 0.37),
    materialFita
  );
  fita.position.y = 0.176;
  grupo.add(fita);

  grupo.position.set(maquina.position.x, 0.55, 4.95);
  scene.add(grupo);
  produtosEmMovimento.push({ grupo, maquina, fase: "saindo", velocidade: 1.35 });
  totalPacotesProduzidos += 1;
  registrarEvento(`Caixa ${totalPacotesProduzidos} produzida na ${maquina.userData.nome}.`);
}

function atualizarProdutos(delta) {
  const intervaloMinimo = 2.8;
  const distanciaSegura = 0.85;

  // A capacidade dos quatro buffers é o limite físico da linha. Cada máquina
  // mantém no máximo uma caixa em movimento; quando o buffer enche, a caixa
  // aguarda na esteira e a produção daquela linha retoma assim que há vaga.
  const linhasAtivasDisponiveis = maquinas.filter((maquina) =>
    maquina.userData.estado === "Produzindo" &&
    !produtosEmMovimento.some((produto) => produto.maquina === maquina)
  );

  if (linhasAtivasDisponiveis.length > 0) {
    tempoEntreProdutos += delta;

    if (tempoEntreProdutos >= intervaloMinimo) {
      const maquina = linhasAtivasDisponiveis[indiceProximaLinha % linhasAtivasDisponiveis.length];
      criarProdutoNaEsteira(maquina);
      indiceProximaLinha += 1;
      tempoEntreProdutos = 0;
    }
  } else {
    tempoEntreProdutos = 0;
  }

  function existeEspacoParaEntrarNaEsteira(produto) {
    return produtosEmMovimento.every((outro) => {
      if (outro === produto) return true;
      if (outro.fase !== "na-esteira" && outro.fase !== "aguardando") return true;
      return Math.abs(outro.grupo.position.x - produto.grupo.position.x) >= distanciaSegura;
    });
  }

  for (let i = produtosEmMovimento.length - 1; i >= 0; i -= 1) {
    const produto = produtosEmMovimento[i];

    if (produto.fase === "saindo") {
      produto.grupo.position.z -= produto.velocidade * delta;

      if (produto.grupo.position.z <= 4.24) {
        produto.grupo.position.z = 4.24;
        produto.fase = "aguardando";
      }
    }

    if (produto.fase === "aguardando" && existeEspacoParaEntrarNaEsteira(produto)) {
      produto.grupo.position.z = 4.2;
      produto.fase = "na-esteira";
    }

    if (produto.fase === "na-esteira") {
      const xAtual = produto.grupo.position.x;
      const produtosAdiante = produtosEmMovimento
        .filter((outro) =>
          outro !== produto &&
          outro.fase === "na-esteira" &&
          outro.grupo.position.x > xAtual
        )
        .sort((a, b) => a.grupo.position.x - b.grupo.position.x);

      const proximoProduto = produtosAdiante[0];
      const limiteX = proximoProduto
        ? proximoProduto.grupo.position.x - distanciaSegura
        : 4.8;

      produto.grupo.position.x = Math.min(
        xAtual + produto.velocidade * delta,
        Math.max(xAtual, limiteX)
      );

      if (produto.grupo.position.x >= 4.8 && adicionarPacoteAoPallet(produto)) {
        produtosEmMovimento.splice(i, 1);
      }
    }
  }
}

function atualizarFuncionarios(delta, tempo) {
  funcionarios.forEach((funcionario) => {
    let restante = funcionario.velocidadeCaminhada * delta;
    while (restante > 0) {
      const destino = funcionario.rota[funcionario.indiceRota];
      const dx = destino.x - funcionario.grupo.position.x;
      const dz = destino.z - funcionario.grupo.position.z;
      const distancia = Math.hypot(dx, dz);
      if (distancia < 0.001) {
        funcionario.indiceRota = (funcionario.indiceRota + 1) % funcionario.rota.length;
        continue;
      }
      funcionario.grupo.rotation.y = Math.atan2(dx, dz);
      const passo = Math.min(restante, distancia);
      funcionario.grupo.position.x += (dx / distancia) * passo;
      funcionario.grupo.position.z += (dz / distancia) * passo;
      restante -= passo;
      if (passo >= distancia) {
        funcionario.indiceRota = (funcionario.indiceRota + 1) % funcionario.rota.length;
      }
    }

    const balanco = Math.sin(tempo * 7 + funcionario.fase) * 0.42;
    funcionario.grupo.position.y = Math.abs(Math.sin(tempo * 7 + funcionario.fase)) * 0.035;

    funcionario.bracoEsquerdo.rotation.z = 0.35 + balanco * 0.55;
    funcionario.bracoDireito.rotation.z = -0.35 - balanco * 0.55;
    funcionario.pernaEsquerda.rotation.z = balanco;
    funcionario.pernaDireita.rotation.z = -balanco;
  });
}

function iniciarRotaEmpilhadeira(pontos, estado) {
  empilhadeira.rota = pontos.map(([x, z]) => new THREE.Vector3(x, 0, z));
  empilhadeira.indiceRota = 0;
  empilhadeira.estado = estado;
}

function moverEmpilhadeira(delta) {
  const restanteInicial = empilhadeira.velocidade * delta;
  let restante = restanteInicial;

  while (restante > 0 && empilhadeira.indiceRota < empilhadeira.rota.length) {
    const destino = empilhadeira.rota[empilhadeira.indiceRota];
    const dx = destino.x - empilhadeira.grupo.position.x;
    const dz = destino.z - empilhadeira.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    if (distancia < 0.001) {
      empilhadeira.indiceRota += 1;
      continue;
    }

    empilhadeira.grupo.rotation.y = Math.atan2(dx, dz);
    const passo = Math.min(restante, distancia);
    empilhadeira.grupo.position.x += (dx / distancia) * passo;
    empilhadeira.grupo.position.z += (dz / distancia) * passo;
    restante -= passo;

    if (passo >= distancia) empilhadeira.indiceRota += 1;
  }

  empilhadeira.rodas.forEach((roda) => {
    roda.rotation.x += restanteInicial * 2.5;
  });

  return empilhadeira.indiceRota >= empilhadeira.rota.length;
}

function atualizarEmpilhadeira(delta) {
  if (empilhadeira.estado === "aguardando" && palletsAguardando.length > 0 && palletsProntos.length < vagasPaletesProntos.length) {
    empilhadeira.palletAlvo = palletsAguardando[0];
    empilhadeira.pontoColetaX = empilhadeira.palletAlvo.userData.vagaBuffer;
    const vagasProntasOcupadas = new Set(palletsProntos.map((pallet) => pallet.userData.vagaPronta));
    empilhadeira.destinoX = vagasPaletesProntos.find((vaga) => !vagasProntasOcupadas.has(vaga));
    const rotaAteColeta = empilhadeira.jaRetornouPeloCanto
      ? [[10.5, 5.8], [empilhadeira.pontoColetaX, 5.8], [empilhadeira.pontoColetaX, 5.2]]
      : [[empilhadeira.pontoColetaX, 5.5], [empilhadeira.pontoColetaX, 5.2]];
    iniciarRotaEmpilhadeira(rotaAteColeta, "coletando");
    registrarEvento(`Empilhadeira iniciou a coleta do ${empilhadeira.palletAlvo.userData.id}.`);
  }

  if (empilhadeira.estado === "aguardando") return;

  const rotaConcluida = moverEmpilhadeira(delta);
  if (empilhadeira.estado === "entregando" && empilhadeira.indiceRota > 0 && empilhadeira.vagaBufferReservada !== null) {
    empilhadeira.vagaBufferReservada = null;
  }
  if (!rotaConcluida) return;

  if (empilhadeira.estado === "coletando") {
    empilhadeira.jaRetornouPeloCanto = false;
    const indicePallet = palletsAguardando.indexOf(empilhadeira.palletAlvo);
    if (indicePallet >= 0) palletsAguardando.splice(indicePallet, 1);
    empilhadeira.vagaBufferReservada = empilhadeira.pontoColetaX;
    empilhadeira.grupo.attach(empilhadeira.palletAlvo);
    registrarEtapaPallet(empilhadeira.palletAlvo, "Em transporte", "Em transporte para pallets prontos");
    empilhadeira.palletAlvo.position.set(0, 0.42, 1.0);
    empilhadeira.carga = empilhadeira.palletAlvo;
    empilhadeira.palletAlvo = null;

    iniciarRotaEmpilhadeira(
      [
        [empilhadeira.pontoColetaX, 3.0],
        [8.3, 3.0],
        [8.3, -2.3],
        [empilhadeira.destinoX, -2.3]
      ],
      "entregando"
    );
    return;
  }

  if (empilhadeira.estado === "entregando") {
    scene.attach(empilhadeira.carga);
    // Deixa uma folga entre o pallet entregue e a empilhadeira na rota de retorno.
    empilhadeira.carga.position.set(empilhadeira.destinoX, 0, -3.8);
    empilhadeira.carga.rotation.set(0, 0, 0);
    empilhadeira.carga.userData.vagaPronta = empilhadeira.destinoX;
    registrarEtapaPallet(empilhadeira.carga, "Pronto para expedição", "Área de pallets prontos");
    palletsProntos.push(empilhadeira.carga);
    registrarEvento(`${empilhadeira.carga.userData.id} chegou à área de prontos (${palletsProntos.length}/${vagasPaletesProntos.length}).`);
    empilhadeira.carga = null;

    iniciarRotaEmpilhadeira(
      [[10.5, -2.3], [10.5, 5.8]],
      "retornando"
    );
  } else {
    empilhadeira.estado = "aguardando";
    empilhadeira.jaRetornouPeloCanto = true;
    empilhadeira.rota = [];
    empilhadeira.indiceRota = 0;
    empilhadeira.grupo.rotation.y = Math.PI;
  }
}

function descartarPallet(pallet) {
  if (pallet.userData?.tipo === "palletProducao") {
    registrarEtapaPallet(pallet, "Expedido", "Expedido pelo caminhão");
    palletsProducaoEmCena.delete(pallet);
  }
  pallet.traverse((objeto) => {
    if (objeto.geometry) objeto.geometry.dispose();
    if (objeto.material) {
      const materiais = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
      materiais.forEach((material) => material.dispose());
    }
  });
  if (pallet.parent) pallet.parent.remove(pallet);
}

function atualizarCaminhao(delta) {
  if (caminhao.estado === "parado" && palletsProntos.length >= vagasPaletesProntos.length) {
    caminhao.cargas = palletsProntos.splice(0, vagasPaletesProntos.length);
    caminhao.cargas.forEach((pallet, indice) => {
      if (pallet.userData?.tipo === "palletProducao") {
        registrarEtapaPallet(pallet, "Em expedição", "Caminhão");
      }
      caminhao.grupo.attach(pallet);
      const posicoes = [
        [-0.95, 0.84, -0.43], [-0.05, 0.84, -0.43],
        [-0.95, 0.84, 0.43], [-0.05, 0.84, 0.43]
      ];
      const [x, y, z] = posicoes[indice];
      pallet.position.set(x, y, z);
      pallet.rotation.set(0, 0, 0);
    });
    caminhao.grupo.rotation.y = Math.PI;
    caminhao.estado = "saindo";
    const idsCarregados = caminhao.cargas.map((pallet) => pallet.userData.id).join(", ");
    registrarEvento(`Caminhão saiu com ${caminhao.cargas.length} pallets: ${idsCarregados}.`);
  }

  if (caminhao.estado === "saindo") {
    caminhao.grupo.position.x -= caminhao.velocidade * delta;
    if (caminhao.grupo.position.x <= -9.2) {
      caminhao.cargas.forEach(descartarPallet);
      totalPalletsExpedidos += caminhao.cargas.length;
      caminhao.cargas = [];
      registrarEvento(`Expedição concluída. Total acumulado: ${totalPalletsExpedidos} pallets.`);
      caminhao.grupo.rotation.y = 0;
      caminhao.estado = "retornando";
    }
  } else if (caminhao.estado === "retornando") {
    caminhao.grupo.position.x += caminhao.velocidade * delta;
    if (caminhao.grupo.position.x >= 8.4) {
      caminhao.grupo.position.x = 8.4;
      caminhao.estado = "parado";
    }
  }
}

const raycaster = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let palletSelecionado = null;
let maquinaSelecionada = null;

function selecionarPallet(pallet, dadosRegistro = null) {
  maquinaSelecionada = null;
  if (palletSelecionado) aplicarDestaquePallet(palletSelecionado, false);

  palletSelecionado = pallet;
  if (palletSelecionado) aplicarDestaquePallet(palletSelecionado, true);

  const dados = pallet ? pallet.userData : dadosRegistro;

  document.getElementById("tituloDetalhes").textContent = "Detalhes do pallet";
  document.getElementById("dadosMaquina").hidden = true;


  document.getElementById("statusPallet").textContent =
    `${dados.id} selecionado`;
  document.getElementById("dadosPallet").hidden = false;
  document.getElementById("endereco").textContent = dados.endereco;
  document.getElementById("produto").textContent = dados.produto;
  document.getElementById("lote").textContent = dados.lote;
  document.getElementById("caixas").textContent =
    `${dados.caixas} caixas`;
  document.getElementById("validade").textContent =
    dados.validade == null ? "Não aplicável à simulação" : `${dados.validade} dias`;
  const statusProducao = document.getElementById("situacaoProducaoPallet");
  if (statusProducao) {
    statusProducao.hidden = dados.tipo !== "palletProducao";
    statusProducao.querySelector("span").textContent = dados.statusOperacional || "";
  }
  const origem = document.getElementById("origemProducaoPallet");
  if (origem) {
    origem.hidden = dados.tipo !== "palletProducao";
    origem.querySelector("span").textContent = dados.linhasOrigem || "";
  }
  const trajeto = document.getElementById("trajetoProducaoPallet");
  if (trajeto) {
    trajeto.hidden = dados.tipo !== "palletProducao";
    trajeto.querySelector("span").textContent = (dados.historicoRastreamento || [])
      .map((etapa) => etapa.endereco)
      .join(" → ");
  }
}

function aplicarDestaquePallet(pallet, ativo) {
  pallet.traverse((objeto) => {
    const materiais = Array.isArray(objeto.material)
      ? objeto.material
      : objeto.material ? [objeto.material] : [];
    for (const material of materiais) {
      if (!material.emissive) continue;
      material.emissive.set(ativo ? "#274c65" : "#000000");
      material.emissiveIntensity = ativo ? 0.35 : 0;
    }
  });
}

function selecionarMaquina(maquina) {
    maquinaSelecionada = maquina;
  if (palletSelecionado) {
    aplicarDestaquePallet(palletSelecionado, false);
    palletSelecionado = null;
  }
  const statusProducao = document.getElementById("situacaoProducaoPallet");
  const origem = document.getElementById("origemProducaoPallet");
  if (statusProducao) statusProducao.hidden = true;
  if (origem) origem.hidden = true;
  const trajeto = document.getElementById("trajetoProducaoPallet");
  if (trajeto) trajeto.hidden = true;

  const dados = maquina.userData;

  document.getElementById("seletorStatusMaquina").value = dados.estado;
  document.getElementById("tituloDetalhes").textContent =
    "Detalhes da produção";
  document.getElementById("statusPallet").textContent =
    `${dados.nome} selecionada`;
  document.getElementById("dadosPallet").hidden = true;
  document.getElementById("dadosMaquina").hidden = false;
  document.getElementById("nomeMaquina").textContent = dados.nome;
  document.getElementById("estadoMaquina").textContent = dados.estado;
  document.getElementById("produtoMaquina").textContent = dados.produto;
  document.getElementById("responsavelMaquina").textContent = dados.responsavel;
  document.getElementById("tempoEstadoMaquina").textContent = dados.tempoEstado;
}

function alterarStatusMaquina() {
  if (!maquinaSelecionada) return;

  const novoEstado =
    document.getElementById("seletorStatusMaquina").value;

  const coresStatus = {
    "Produzindo": "#35a66f",
    "Parada": "#e4574f",
    "Manutenção": "#f2bd3d"
  };

  const responsaveisPorStatus = {
    "Produzindo": "Operador de produção",
    "Parada": "Operador da linha",
    "Manutenção": "Técnico de manutenção"
  };

  const dados = maquinaSelecionada.userData;
  dados.estado = novoEstado;
  gravarArmazenamento(`status-${dados.nome}`, novoEstado);
  dados.tempoEstado = "Agora mesmo";
  dados.responsavel = responsaveisPorStatus[novoEstado];

  dados.indicadorStatus.material.color.set(coresStatus[novoEstado]);
  registrarEvento(`${dados.nome} alterada para ${novoEstado}.`);

  document.getElementById("estadoMaquina").textContent = novoEstado;
  document.getElementById("responsavelMaquina").textContent =
    dados.responsavel;
  document.getElementById("tempoEstadoMaquina").textContent =
    dados.tempoEstado;

  atualizarIndicadoresMaquinas();
  atualizarAlertasOperacionais();

  gravarArmazenamento(`statusDesde-${dados.nome}`, new Date().toISOString());
}

function restaurarStatusIniciais() {
  const estadosIniciais = {
    "LINHA 01": "Produzindo",
    "LINHA 02": "Parada",
    "LINHA 03": "Manutenção"
  };

  const coresStatus = {
    "Produzindo": "#35a66f",
    "Parada": "#e4574f",
    "Manutenção": "#f2bd3d"
  };

  for (const maquina of maquinas) {
    const dados = maquina.userData;

    dados.estado = estadosIniciais[dados.nome];
    dados.responsavel = dadosPorLinha[dados.nome].responsavel;
    dados.tempoEstado = dadosPorLinha[dados.nome].tempoEstado;

    dados.indicadorStatus.material.color.set(coresStatus[dados.estado]);
    removerArmazenamento(`status-${dados.nome}`);
    removerArmazenamento(`statusDesde-${dados.nome}`);
  }

  atualizarIndicadoresMaquinas();
  atualizarAlertasOperacionais();
  registrarEvento("Status das linhas restaurados para a configuração inicial.");

  if (maquinaSelecionada) {
    const dados = maquinaSelecionada.userData;

    document.getElementById("seletorStatusMaquina").value = dados.estado;
    document.getElementById("estadoMaquina").textContent = dados.estado;
    document.getElementById("responsavelMaquina").textContent =
      dados.responsavel;
    document.getElementById("tempoEstadoMaquina").textContent =
      dados.tempoEstado;
  }
}

renderer.domElement.addEventListener("click", (evento) => {
  const areaCanvas = renderer.domElement.getBoundingClientRect();

  ponteiro.x =
    ((evento.clientX - areaCanvas.left) / areaCanvas.width) * 2 - 1;
  ponteiro.y =
    -((evento.clientY - areaCanvas.top) / areaCanvas.height) * 2 + 1;

  raycaster.setFromCamera(ponteiro, camera);
  const palletsNoFiltro = pallets.filter((pallet) => !pallet.userData.foraDoFiltro);
  const meshesPalletsProducao = [];
  for (const pallet of palletsProducaoEmCena) {
    pallet.traverse((objeto) => {
      if (objeto.isMesh) meshesPalletsProducao.push(objeto);
    });
  }
  const objetosClicaveis = [...palletsNoFiltro, ...maquinas, ...meshesPalletsProducao];
  const colisao = raycaster.intersectObjects(objetosClicaveis)[0];

  if (!colisao) return;

  if (colisao.object.userData.tipo === "maquina") {
    selecionarMaquina(colisao.object);
  } else {
    let selecionado = colisao.object;
    while (selecionado && selecionado.userData?.tipo !== "palletProducao" && selecionado !== scene) {
      selecionado = selecionado.parent;
    }
    selecionarPallet(selecionado?.userData?.tipo === "palletProducao" ? selecionado : colisao.object);
  }
});

function buscarPallet() {
  const termo = document
    .getElementById("termoBusca")
    .value
    .trim()
    .toLowerCase();

  if (!termo) return;

  const encontrado = pallets.find((pallet) => {
    const dados = pallet.userData;

    return !dados.foraDoFiltro && [dados.id, dados.endereco, dados.produto, dados.lote].some(
      (valor) => String(valor).toLowerCase().includes(termo)
    );
  });

  if (encontrado) {
    selecionarPallet(encontrado);
    return;
  }

  const registroProducao = registrosPalletsProducao.find((dados) =>
    [dados.id, dados.endereco, dados.produto, dados.lote, dados.statusOperacional, dados.linhasOrigem]
      .some((valor) => String(valor ?? "").toLowerCase().includes(termo))
  );

  if (!registroProducao) {
    document.getElementById("statusPallet").textContent =
      "Nenhum pallet encontrado.";
    document.getElementById("dadosPallet").hidden = true;
    return;
  }

  const grupoAtivo = [...palletsProducaoEmCena].find((pallet) => pallet.userData === registroProducao);
  selecionarPallet(grupoAtivo || null, registroProducao);
}

function aplicarFiltroValidade() {
  const faixa = document.getElementById("filtroValidade").value;

  for (const pallet of pallets) {
    const dias = pallet.userData.validade;
    const corresponde =
      faixa === "todas" ||
      (faixa === "critica" && dias <= 30) ||
      (faixa === "atencao" && dias > 30 && dias <= 90) ||
      (faixa === "regular" && dias > 90);

    pallet.visible = true;
    pallet.userData.foraDoFiltro = !corresponde;
    pallet.material.transparent = !corresponde;
    pallet.material.opacity = corresponde ? 1 : 0.16;
    pallet.material.depthWrite = corresponde;
    pallet.material.needsUpdate = true;
  }

  if (palletSelecionado && palletSelecionado.userData.foraDoFiltro) {
    aplicarDestaquePallet(palletSelecionado, false);
    palletSelecionado = null;

    document.getElementById("statusPallet").textContent =
      "Filtro aplicado. Clique em um pallet para consultar.";
    document.getElementById("dadosPallet").hidden = true;
  }
}

function atualizarAlertasOperacionais() {
  const lista = document.getElementById("listaAlertas");
  lista.replaceChildren();

  const palletsCriticos = pallets.filter(
    (pallet) => pallet.userData.validade <= 30
  );

  const linhasEmAlerta = maquinas.filter(
    (maquina) => maquina.userData.estado !== "Produzindo"
  );

  if (palletsCriticos.length === 0 && linhasEmAlerta.length === 0) {
    const mensagem = document.createElement("p");
    mensagem.textContent = "Nenhum alerta operacional no momento.";
    lista.appendChild(mensagem);
    return;
  }

  function adicionarTitulo(texto) {
    const paragrafo = document.createElement("p");
    const destaque = document.createElement("strong");

    destaque.textContent = texto;
    paragrafo.appendChild(destaque);
    lista.appendChild(paragrafo);
  }

  function adicionarBotao(texto, aoClicar) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "alerta-item";
    botao.textContent = texto;
    botao.addEventListener("click", aoClicar);

    lista.appendChild(botao);
  }

  if (palletsCriticos.length > 0) {
    adicionarTitulo(
      `Pallets com validade até 30 dias (${palletsCriticos.length})`
    );

    for (const pallet of palletsCriticos) {
      const dados = pallet.userData;

      adicionarBotao(
        `${dados.id} · ${dados.endereco} · ${dados.validade} dias`,
        () => {
          document.getElementById("filtroValidade").value = "todas";
          aplicarFiltroValidade();
          selecionarPallet(pallet);
        }
      );
    }
  }

  if (linhasEmAlerta.length > 0) {
    adicionarTitulo(`Linhas que precisam de atenção (${linhasEmAlerta.length})`);

    for (const maquina of linhasEmAlerta) {
      const dados = maquina.userData;

      adicionarBotao(
        `${dados.nome} · ${dados.estado}`,
        () => selecionarMaquina(maquina)
      );
    }
  }
}

document
  .getElementById("filtroValidade")
  .addEventListener("change", aplicarFiltroValidade);

document
  .getElementById("botaoBuscar")
  .addEventListener("click", buscarPallet);

document
  .getElementById("termoBusca")
  .addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") buscarPallet();
  });
  
document
  .getElementById("seletorStatusMaquina")
  .addEventListener("change", alterarStatusMaquina);

document
  .getElementById("restaurarStatus")
  .addEventListener("click", restaurarStatusIniciais);

// Ajuste quando a janela muda de tamanho
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  ajustarEnquadramento();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Desenho contínuo da cena
const relogioAnimacao = new THREE.Clock();

function animar() {
  requestAnimationFrame(animar);
  controls.update();

  const deltaReal = Math.min(relogioAnimacao.getDelta(), 0.05);
  const delta = simulacaoPausada ? 0 : deltaReal * velocidadeSimulacao;
  tempoSimulado += delta;

  atualizarFuncionarios(delta, tempoSimulado);
  atualizarProdutos(delta);
  atualizarEmpilhadeira(delta);
  atualizarCaminhao(delta);
  atualizarPainelOperacao();

  renderer.render(scene, camera);
}

animar();


