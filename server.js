const express = require('express');
const nodeHtmlToImage = require('node-html-to-image');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Proteção simples por API key. Defina RENDER_API_KEY no ambiente do servidor
// e mande o mesmo valor no header 'x-api-key' a partir do n8n.
// Sem isso, qualquer pessoa que descobrir a URL pública consegue usar seu serviço.
app.use((req, res, next) => {
  if (req.path === '/health') return next(); // healthcheck fica público, sem custo de render
  const expectedKey = process.env.RENDER_API_KEY;
  if (!expectedKey) return next(); // se não configurou a env var, roda sem auth (só pra teste local)
  const providedKey = req.get('x-api-key');
  if (providedKey !== expectedKey) {
    return res.status(401).json({ error: 'API key inválida ou ausente (header x-api-key).' });
  }
  next();
});

// POST /render
// body: { html: string, width?: number, height?: number, scale?: number }
// resposta: PNG binário direto (Content-Type: image/png)
app.post('/render', async (req, res) => {
  try {
    const { html, width = 980, height = 1225, scale = 2 } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'Campo "html" é obrigatório.' });
    }

    // Envolve o HTML recebido num documento completo, com <html>/<body>
    // já dimensionados exatamente no tamanho do slide. Isso garante que
    // o screenshot recorte sempre a área certa, independente de como o
    // body se comportaria "sozinho" com o <div class="slide"> dentro.
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: ${width}px;
              height: ${height}px;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Em produção (Docker), o Chrome já vem instalado na imagem base e o
    // caminho dele é passado via env var — evita que a lib tente baixar
    // seu próprio Chromium toda vez que o container sobe.
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    const image = await nodeHtmlToImage({
      html: wrappedHtml,
      type: 'png',
      puppeteerArgs: {
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {
          width,
          height,
          deviceScaleFactor: scale
        }
      }
    });

    res.set('Content-Type', 'image/png');
    res.send(image);
  } catch (err) {
    console.error('Erro ao renderizar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serviço de renderização ouvindo na porta ${PORT}`);
  console.log(`Endpoint: POST /render`);
});
