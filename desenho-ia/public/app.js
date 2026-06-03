// ============================
// VARIÁVEIS GLOBAIS
// ============================
let fotoSujeito    = null;
let fotoDesenho    = null;
let rascunhoGerado = null;
let camaraAtual    = "user"; // "user" = frontal, "environment" = traseira
 
 
// ============================
// INICIAR CÂMARA
// ============================
async function iniciarCamera(videoId) {
  const video = document.getElementById(videoId);
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: camaraAtual }
  });
  video.srcObject = stream;
 
  await new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });
}
 
 
// ============================
// CAPTURAR FRAME DO VÍDEO
// ============================
function capturarFrame(videoId) {
  const video   = document.getElementById(videoId);
  const largura = video.videoWidth  || 640;
  const altura  = video.videoHeight || 480;
 
  const canvas = document.createElement("canvas");
  canvas.width  = largura;
  canvas.height = altura;
  canvas.getContext("2d").drawImage(video, 0, 0, largura, altura);
 
  const imagem = canvas.toDataURL("image/jpeg", 0.8);
 
  if (imagem === "data:," || imagem.length < 100) {
    throw new Error("Câmara ainda não está pronta — tenta novamente");
  }
 
  return imagem;
}
 
 
// ============================
// TRANSFORMAR FOTO EM RASCUNHO (filtro Sobel)
// ============================
function gerarRascunho(imagemBase64) {
  return new Promise(resolve => {
    const img = new Image();
    img.src   = imagemBase64;
 
    img.onload = () => {
      const largura = img.width;
      const altura  = img.height;
 
      const canvasOrig = document.createElement("canvas");
      canvasOrig.width  = largura;
      canvasOrig.height = altura;
      const ctxOrig = canvasOrig.getContext("2d");
      ctxOrig.drawImage(img, 0, 0);
      const pixels = ctxOrig.getImageData(0, 0, largura, altura).data;
 
      const canvasRes = document.createElement("canvas");
      canvasRes.width  = largura;
      canvasRes.height = altura;
      const ctxRes = canvasRes.getContext("2d");
 
      // Cinzentos
      const cz = new Uint8ClampedArray(largura * altura);
      for (let i = 0; i < pixels.length; i += 4) {
        cz[i/4] = 0.299*pixels[i] + 0.587*pixels[i+1] + 0.114*pixels[i+2];
      }
 
      // Sobel
      const bordas = new Uint8ClampedArray(largura * altura);
      for (let y = 1; y < altura-1; y++) {
        for (let x = 1; x < largura-1; x++) {
          const tl=cz[(y-1)*largura+(x-1)], tc=cz[(y-1)*largura+x], tr=cz[(y-1)*largura+(x+1)];
          const ml=cz[y*largura+(x-1)],                               mr=cz[y*largura+(x+1)];
          const bl=cz[(y+1)*largura+(x-1)], bc=cz[(y+1)*largura+x], br=cz[(y+1)*largura+(x+1)];
          const gx=-tl-2*ml-bl+tr+2*mr+br;
          const gy=-tl-2*tc-tr+bl+2*bc+br;
          bordas[y*largura+x] = Math.min(255, Math.sqrt(gx*gx+gy*gy));
        }
      }
 
      const limiar      = 60;
      const intensidade = 1.0;
      const resultado   = ctxRes.createImageData(largura, altura);
      const d = resultado.data;
 
      for (let i = 0; i < bordas.length; i++) {
        const borda = bordas[i] < limiar ? 0 : bordas[i];
        const valor = 255 - Math.min(255, borda * intensidade);
        const idx = i * 4;
        d[idx] = d[idx+1] = d[idx+2] = valor;
        d[idx+3] = 255;
      }
 
      ctxRes.putImageData(resultado, 0, 0);
      resolve(canvasRes.toDataURL("image/png"));
    };
  });
}
 
 
// ============================
// CALCULAR SEMELHANÇA
// Converte o desenho fotografado em rascunho e compara traço a traço
// ============================
async function calcularSemelhanca(rascunhoOriginal, fotoDoDesenho) {
 
  // Converte o desenho fotografado com o mesmo filtro
  // Agora comparamos: rascunho ↔ rascunho do desenho
  const rascunhoDesenho = await gerarRascunho(fotoDoDesenho);
 
  const tamanho = 200;
 
  function binarizar(src) {
    return new Promise(res => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = tamanho;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, tamanho, tamanho);
        const pixels = ctx.getImageData(0, 0, tamanho, tamanho).data;
 
        // Pixels escuros = traço (1), brancos = fundo (0)
        const b = new Uint8ClampedArray(tamanho * tamanho);
        for (let i = 0; i < pixels.length; i += 4) {
          const cinzento = 0.299*pixels[i] + 0.587*pixels[i+1] + 0.114*pixels[i+2];
          b[i/4] = cinzento < 200 ? 1 : 0;
        }
        res(b);
      };
    });
  }
 
  const [bordasA, bordasB] = await Promise.all([
    binarizar(rascunhoOriginal),
    binarizar(rascunhoDesenho)
  ]);
 
  // Conta quantos traços do original foram reproduzidos no desenho
  let tracosOriginal   = 0;
  let tracosCoincidentes = 0;
 
  for (let i = 0; i < bordasA.length; i++) {
    if (bordasA[i] === 1) {
      tracosOriginal++;
      if (bordasB[i] === 1) tracosCoincidentes++;
    }
  }
 
  if (tracosOriginal === 0) return 0;
  return Math.min(100, Math.round((tracosCoincidentes / tracosOriginal) * 100));
}
 
 
// ============================
// MENSAGEM CONSOANTE A PERCENTAGEM
// ============================
function mensagemPorPercentagem(pct) {
  if (pct >= 80) return "Incrível! O teu desenho está muito parecido com o esboço! 🏆";
  if (pct >= 60) return "Muito bom! Conseguiste capturar bem as formas principais! 🌟";
  if (pct >= 40) return "Bom trabalho! As linhas principais estão lá! Continua a praticar! 💪";
  if (pct >= 20) return "Boa tentativa! Foca-te nos contornos principais do esboço. ✏️";
  return "Continua a praticar! Tenta seguir mais de perto as linhas do esboço. 🎨";
}
 
 
// ============================
// PASSO 1 — Capturar foto do sujeito
// ============================
async function capturarSujeito() {
  try {
    fotoSujeito = capturarFrame("video");
  } catch (e) {
    alert(e.message);
    return;
  }
 
  document.getElementById("loading").style.display = "block";
  document.getElementById("passo1").style.display  = "none";
 
  rascunhoGerado = await gerarRascunho(fotoSujeito);
 
  const imgRef = document.createElement("img");
  imgRef.src   = rascunhoGerado;
  imgRef.id    = "img-referencia";
  document.getElementById("foto-referencia").appendChild(imgRef);
 
  document.getElementById("esboco-texto").innerText =
    "Usa este esboço como guia. Tenta reproduzir as linhas e formas que vês!";
 
  document.getElementById("loading").style.display = "none";
  document.getElementById("passo2").style.display  = "block";
}
 
 
// ============================
// PASSO 2 → PASSO 3
// ============================
async function passarParaPasso3() {
  document.getElementById("passo2").style.display = "none";
  document.getElementById("passo3").style.display = "block";
  await iniciarCamera("video2");
}
 
 
// ============================
// PASSO 3 — Capturar e comparar o desenho
// ============================
async function capturarDesenho() {
  try {
    fotoDesenho = capturarFrame("video2");
  } catch (e) {
    alert(e.message);
    return;
  }
 
  document.getElementById("loading").style.display = "block";
  document.getElementById("passo3").style.display  = "none";
 
  const percentagem = await calcularSemelhanca(rascunhoGerado, fotoDesenho);
  const mensagem    = mensagemPorPercentagem(percentagem);
 
  document.getElementById("feedback-texto").innerHTML =
    `<strong style="font-size:48px;">${percentagem}%</strong><br><br>${mensagem}`;
 
  document.getElementById("loading").style.display   = "none";
  document.getElementById("resultado").style.display = "block";
}
 
 
// ============================
// RECOMEÇAR
// ============================
function recomecar() {
  fotoSujeito    = null;
  fotoDesenho    = null;
  rascunhoGerado = null;
 
  document.getElementById("foto-referencia").innerHTML = "";
  document.getElementById("resultado").style.display  = "none";
  document.getElementById("passo1").style.display     = "block";
 
  iniciarCamera("video");
}
 
 
// ============================
// INICIALIZAÇÃO
// ============================
iniciarCamera("video");
 
// ============================
// TROCAR CÂMARA (frontal ↔ traseira)
// ============================
async function trocarCamera() {
  const video = document.getElementById("video");
 
  // Para o stream atual
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
 
  // Alterna entre frontal e traseira
  camaraAtual = camaraAtual === "user" ? "environment" : "user";
 
  // Atualiza o texto do botão
  const btn = document.getElementById("btn-trocar");
  btn.innerText = camaraAtual === "user" ? "🔄 Trocar câmara" : "🤳 Câmara frontal";
 
  // Reinicia com a nova câmara
  await iniciarCamera("video");
}
 
// ============================
// VERIFICAR NÚMERO DE CÂMARAS
// Esconde o botão de trocar se só houver uma câmara
// ============================
async function verificarCamaras() {
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    const camaras = dispositivos.filter(d => d.kind === "videoinput");
 
    const btn = document.getElementById("btn-trocar");
 
    if (camaras.length <= 1) {
      // Só uma câmara — esconde o botão de trocar
      btn.style.display = "none";
    } else {
      // Mais de uma câmara — mostra o botão
      btn.style.display = "block";
    }
  } catch (e) {
    // Se não conseguir verificar, esconde o botão por precaução
    document.getElementById("btn-trocar").style.display = "none";
  }
}
 
// Corre a verificação quando a página carrega
verificarCamaras();
 
// ============================
// LIGAR / DESLIGAR CÂMARA
// ============================
let camaraLigada = true;
 
async function toggleCamera() {
  const video = document.getElementById("video");
  const btn   = document.getElementById("btn-toggle");
  const btnCapturar = document.getElementById("btn-capturar");
 
  if (camaraLigada) {
    // Desligar — para o stream e esconde o vídeo
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    video.style.display   = "none";
    btn.innerText         = "📷 Ligar câmara";
    btnCapturar.disabled  = true;
    btnCapturar.style.opacity = "0.4";
    camaraLigada = false;
 
  } else {
    // Ligar — retoma o stream
    video.style.display   = "block";
    btn.innerText         = "📷 Desligar câmara";
    btnCapturar.disabled  = false;
    btnCapturar.style.opacity = "1";
    camaraLigada = true;
    await iniciarCamera("video");
  }
}