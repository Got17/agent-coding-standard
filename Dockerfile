# Stage 1: Build the VitePress site
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Using the script you already added to package.json
RUN npm run build 

# Stage 2: Serve the static files with lightweight NGINX
FROM nginx:alpine
# Copy the built VitePress files to NGINX's default public directory
COPY --from=builder /app/docs/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]