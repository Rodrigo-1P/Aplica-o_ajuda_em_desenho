// ============================
// VARIÁVEIS GLOBAIS
// ============================
let fotoSujeito = null;   // Guarda a foto tirada no passo 1
let fotoDesenho = null;   // Guarda a foto tirada no passo 3
 
 
// ============================
// INICIAR CÂMARA
// Abre a câmara no elemento de vídeo indicado
// ============================
async function iniciarCamera(videoId) {
  const video = document.getElementById(videoId);
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
}
 
 
// ============================
// PASSO 1 — Capturar foto do sujeito
// ============================
async function capturarSujeito() {
 
  const video = document.getElementById("video");
 
  // Cria um canvas invisível para capturar o frame do vídeo
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
 
  // Converte a imagem para base64 (formato para enviar ao servidor)
  fotoSujeito = canvas.toDataURL("image/jpeg");
 
  // Envia a foto ao servidor para gerar o esboço
  const resposta = await fetch("/gerar-esboco", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foto: fotoSujeito })
  });
 
  const dados = await resposta.json();
 
  // Mostra o esboço recebido da IA
  document.getElementById("esboco-texto").innerText = dados.esboco;
 
  // Passa para o passo 2
  document.getElementById("passo1").style.display = "none";
  document.getElementById("passo2").style.display = "block";
}
 
 
// ============================
// PASSO 2 → PASSO 3
// A pessoa já desenhou, agora vai fotografar o seu desenho
// ============================
async function passarParaPasso3() {
  document.getElementById("passo2").style.display = "none";
  document.getElementById("passo3").style.display = "block";
 
  // Inicia a câmara para o passo 3
  await iniciarCamera("video2");
}
 
 
// ============================
// PASSO 3 — Capturar foto do desenho
// ============================
async function capturarDesenho() {
 
  const video = document.getElementById("video2");
 
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
 
  fotoDesenho = canvas.toDataURL("image/jpeg");
 
  // Envia as duas fotos ao servidor para comparação
  const resposta = await fetch("/comparar-desenho", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fotoOriginal: fotoSujeito,
      fotoDesenho: fotoDesenho
    })
  });
 
  const dados = await resposta.json();
 
  // Mostra o feedback da IA
  document.getElementById("feedback-texto").innerText = dados.feedback;
 
  // Passa para o resultado
  document.getElementById("passo3").style.display = "none";
  document.getElementById("resultado").style.display = "block";
}
 
 
// ============================
// RECOMEÇAR — Volta ao início
// ============================
function recomecar() {
  fotoSujeito = null;
  fotoDesenho = null;
 
  document.getElementById("resultado").style.display = "none";
  document.getElementById("passo1").style.display = "block";
 
  iniciarCamera("video");
}
 
 
// ============================
// INICIALIZAÇÃO — Corre quando a página abre
// ============================
iniciarCamera("video");