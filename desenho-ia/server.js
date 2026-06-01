// ============================
// DEPENDÊNCIAS
// ============================
const express = require("express");
const path    = require("path");
const fetch   = require("node-fetch");
require("dotenv").config();
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// Permite receber JSON no body dos pedidos (imagens em base64 podem ser grandes)
app.use(express.json({ limit: "20mb" }));
 
// Serve os ficheiros da pasta public (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));
 
 
// ============================
// GEMINI — Configuração
// ============================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
 
 
// ============================
// FUNÇÃO AUXILIAR — Chamar o Gemini com imagem
// Recebe: a imagem em base64 + o prompt de texto
// Devolve: a resposta da IA em texto
// ============================
async function chamarGemini(imagemBase64, prompt) {
 
  // Remove o prefixo "data:image/jpeg;base64," se existir
  const imagemLimpa = imagemBase64.replace(/^data:image\/\w+;base64,/, "");
 
  const body = {
    contents: [
      {
        parts: [
          {
            // A imagem enviada em base64
            inline_data: {
              mime_type: "image/jpeg",
              data: imagemLimpa
            }
          },
          {
            // O pedido em texto
            text: prompt
          }
        ]
      }
    ]
  };
 
  const resposta = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
 
  const dados = await resposta.json();
 
  // Extrai o texto da resposta do Gemini
  return dados.candidates[0].content.parts[0].text;
}
 
 
// ============================
// SUPABASE — Ligação à base de dados
// Descomenta quando precisares de guardar imagens
// ============================
// const { createClient } = require("@supabase/supabase-js");
// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY
// );
 
 
// ============================
// ROTA: GERAR ESBOÇO
// Recebe a foto do sujeito, envia ao Gemini, devolve descrição do esboço
// ============================
app.post("/gerar-esboco", async (req, res) => {
 
  const { foto } = req.body;
 
  try {
 
    const prompt = `
      Analisa esta imagem e descreve de forma simples os contornos e formas principais 
      que a compõem, como se fosses guiar um iniciante a desenhá-la.
      Menciona: forma geral, proporções, linhas principais e detalhes importantes.
      Responde em português, de forma clara e motivadora para quem está a aprender a desenhar.
      Máximo 5 linhas.
    `;
 
    const esboco = await chamarGemini(foto, prompt);
 
    res.json({ esboco });
 
  } catch (erro) {
    console.error("Erro ao gerar esboço:", erro);
    res.status(500).json({ erro: "Erro ao gerar esboço" });
  }
 
});
 
 
// ============================
// ROTA: COMPARAR DESENHO
// Recebe a foto original + o desenho, pede feedback ao Gemini
// ============================
app.post("/comparar-desenho", async (req, res) => {
 
  const { fotoOriginal, fotoDesenho } = req.body;
 
  try {
 
    // O Gemini recebe as duas imagens numa só chamada
    const imagemOriginalLimpa = fotoOriginal.replace(/^data:image\/\w+;base64,/, "");
    const imagemDesenhoLimpa  = fotoDesenho.replace(/^data:image\/\w+;base64,/, "");
 
    const body = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imagemOriginalLimpa
              }
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imagemDesenhoLimpa
              }
            },
            {
              text: `
                A primeira imagem é a referência original.
                A segunda imagem é o desenho feito por um aluno iniciante.
                Compara as duas e dá um feedback construtivo e motivador em português.
                Menciona: o que está bem, o que pode melhorar, e uma dica prática.
                Máximo 5 linhas.
              `
            }
          ]
        }
      ]
    };
 
    const resposta = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
 
    const dados = await resposta.json();
    const feedback = dados.candidates[0].content.parts[0].text;
 
    res.json({ feedback });
 
  } catch (erro) {
    console.error("Erro ao comparar desenho:", erro);
    res.status(500).json({ erro: "Erro ao comparar desenho" });
  }
 
});
 
 
// ============================
// INICIAR SERVIDOR
// ============================
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});