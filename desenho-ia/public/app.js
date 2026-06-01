// ============================
// VARIÁVEIS GLOBAIS
// ============================
let fotoSujeito = null;   // Guarda a foto tirada no passo 1
let fotoDesenho = null;   // Guarda a foto tirada no passo 3
 
 
// ============================
// INICIAR CÂMARA
// Usa a câmara traseira no mobile (environment)
// ============================
async function iniciarCamera(videoId) {
  const video = document.getElementById(videoId);
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" } // câmara traseira no mobile
  });
  video.srcObject = stream;
}
 
 
// ============================
// PASSO 1 — Capturar foto do sujeito
// ============================
async function capturarSujeito() {
 
  const video = document.getElementById("video");
 
  // Mostra indicador de carregamento
  document.getElementById("loading").style.display = "block";
  document.getElementById("passo1").style.display  = "none";
 
  const canvas = document.createElement("canvas");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
 
  fotoSujeito = canvas.toDataURL("image/jpeg");
 
  const resposta = await fetch("/gerar-esboco", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foto: fotoSujeito })
  });
 
  const dados = await resposta.json();
 
  // Mostra a foto tirada como referência visual
  const imgRef = document.createElement("img");
  imgRef.src   = fotoSujeito;
  imgRef.id    = "img-referencia";
  document.getElementById("foto-referencia").appendChild(imgRef);
 
  // Mostra o texto descritivo do Gemini
  document.getElementById("esboco-texto").innerText = dados.esboco;
 
  // Esconde loading, mostra passo 2
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
// PASSO 3 — Capturar foto do desenho
// ============================
async function capturarDesenho() {
 
  const video = document.getElementById("video2");
 
  // Mostra indicador de carregamento
  document.getElementById("loading").style.display = "block";
  document.getElementById("passo3").style.display  = "none";
 
  const canvas = document.createElement("canvas");
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
 
  fotoDesenho = canvas.toDataURL("image/jpeg");
 
  const resposta = await fetch("/comparar-desenho", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fotoOriginal: fotoSujeito,
      fotoDesenho:  fotoDesenho
    })
  });
 
  const dados = await resposta.json();
 
  document.getElementById("feedback-texto").innerText = dados.feedback;
 
  document.getElementById("loading").style.display   = "none";
  document.getElementById("resultado").style.display = "block";
}
 
 
// ============================
// RECOMEÇAR
// ============================
function recomecar() {
  fotoSujeito = null;
  fotoDesenho = null;
 
  // Limpa a foto de referência
  document.getElementById("foto-referencia").innerHTML = "";
 
  document.getElementById("resultado").style.display = "none";
  document.getElementById("passo1").style.display    = "block";
 
  iniciarCamera("video");
}
 
 
// ============================
// INICIALIZAÇÃO
// ============================
iniciarCamera("video");