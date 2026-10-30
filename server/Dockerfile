# WYX.SPACE API 镜像（fx1 B-12）
# 零依赖 Node 服务，数据目录挂载到卷；构建上下文是仓库根目录。
#
#   docker build -f server/Dockerfile -t wyx-api .
#   docker run -p 8787:8787 --env-file .env -v wyx-data:/data wyx-api
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    API_DATA_DIR=/data

COPY server ./server
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 8787
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8787/healthz >/dev/null || exit 1

CMD ["node", "server/index.mjs"]
