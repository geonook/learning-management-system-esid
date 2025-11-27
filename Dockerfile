FROM node:22-slim
LABEL "language"="nodejs"
LABEL "framework"="next.js"
WORKDIR /src
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm run build

# Copy static assets to standalone directory
# Standalone mode does not include public and .next/static by default
RUN cp -r public .next/standalone/ && \
    mkdir -p .next/standalone/.next && \
    cp -r .next/static .next/standalone/.next/

EXPOSE 8080
CMD ["node", ".next/standalone/server.js"]
