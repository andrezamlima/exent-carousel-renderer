# Base simples do Node — instalamos o Chrome nós mesmos abaixo, em vez de
# depender de um caminho pré-instalado "escondido" numa imagem de terceiros.
FROM node:20-slim

# Instala o Google Chrome estável direto do repositório oficial do Google.
# Isso garante um caminho fixo e conhecido (/usr/bin/google-chrome-stable),
# sem depender de onde o pacote puppeteer decidiu cachear seu próprio download.
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Impede que o pacote "puppeteer" do package.json baixe seu PRÓPRIO Chrome
# durante o npm install — já temos um instalado acima, e vamos apontar pra ele.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
