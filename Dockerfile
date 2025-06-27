# 1. Base Image: glibc-basiert, wie von Ihnen korrekt identifiziert
FROM node:20-slim

# Installiert System-Dependencies, die für einige npm-Pakete benötigt werden
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Kopiert nur die package-Dateien, um den npm-Cache-Layer zu nutzen
COPY package.json package-lock.json ./

# Installiert Dependencies (npm install für bessere Kompatibilität)
RUN npm install --production=false

# Der entscheidende Fix von Ihnen: explizite SWC-Binary für GNU/Linux (glibc)
RUN npm install @swc/core-linux-x64-gnu

# Kopiert den Rest des App-Codes
COPY . .

# --- Build Stage ---

# Definieren Sie Build-Argumente. Diese existieren NUR während des Builds.
# Der NODE_ENV wird als ARG definiert und dann an ENV übergeben.
ARG NODE_ENV=production
ARG STRAPI_ADMIN_BACKEND_URL
ARG DATABASE_URL

# Setzen Sie die Umgebungsvariablen für den Build-Prozess.
ENV NODE_ENV=${NODE_ENV}
ENV STRAPI_ADMIN_BACKEND_URL=${STRAPI_ADMIN_BACKEND_URL}
ENV DATABASE_URL=${DATABASE_URL}

# Temporär vereinfachter Build-Befehl für klares Fehler-Logging
RUN npm run build

# Ensure all required Strapi directories exist
RUN mkdir -p public public/uploads build .tmp

# Create favicon.ico to prevent 500 errors
RUN touch public/favicon.ico

# --- Production Stage ---
# Hier könnte man einen Multi-Stage-Build machen, aber für die Einfachheit lassen wir es erstmal so.

# Setzt die Laufzeit-Umgebungsvariable.
# Die anderen Variablen (DATABASE_URL etc.) kommen zur Laufzeit von Railway!
ENV NODE_ENV=development

EXPOSE 1337

CMD ["npm", "start"]