# Imagem oficial do Puppeteer: já vem com o Chrome instalado e todas as
# bibliotecas de sistema que o Chrome precisa pra rodar headless em Linux.
# Isso evita o erro mais comum de quem tenta rodar Puppeteer em produção
# ("Chrome não conseguiu iniciar") por falta de dependências do sistema.
FROM ghcr.io/puppeteer/puppeteer:23.9.0

# A imagem já roda como usuário não-root (pptruser) por padrão — mantemos assim.
WORKDIR /app

# Copia só os arquivos de dependência primeiro (melhora cache de build)
COPY --chown=pptruser:pptruser package*.json ./

RUN npm install --omit=dev

COPY --chown=pptruser:pptruser . .

EXPOSE 3000

CMD ["node", "server.js"]
