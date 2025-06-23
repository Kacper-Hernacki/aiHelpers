FROM oven/bun:1

WORKDIR /app

COPY package*.json ./
RUN bun install

COPY . .

# Generate Prisma client
RUN bunx prisma generate

EXPOSE 3000

CMD ["bun", "run", "start"]