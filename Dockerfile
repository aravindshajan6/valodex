# Runtime-only image. The Next build happens in CI on the runner (which has the
# seeded Postgres on localhost); this just packages the standalone output.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY .next/standalone ./
COPY .next/static ./.next/static
EXPOSE 3000
CMD ["node","server.js"]
