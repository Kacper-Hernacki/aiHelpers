FROM oven/bun:1

WORKDIR /app

COPY package*.json ./
RUN bun install

COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Set environment variables to disable pdf-parse test features
ENV NODE_ENV=production
ENV PDF_PARSE_DISABLE_TESTS=true

EXPOSE 3000

CMD ["bun", "run", "start"]