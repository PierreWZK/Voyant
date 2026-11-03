# Voyant : Vite (front) + Express (API) dans un seul conteneur, déployé par Coolify.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# npm saute parfois le binaire Alpine de lightningcss (dépendance optionnelle) : on vérifie, et on relance une fois.
RUN (npm ci && node -e "require('lightningcss')") || (npm ci && node -e "require('lightningcss')")

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
