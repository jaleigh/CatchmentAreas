ARG NODE_VERSION=20.16.0

# dev target ##################################################################
FROM node:${NODE_VERSION}-slim AS dev

# Update the package list and install dependencies
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

#USER node

WORKDIR /home/catchments

COPY .vscode ./.vscode
COPY public ./public
COPY scripts ./scripts
COPY src ./src
COPY package.json .
COPY package-lock.json .
COPY postcss.config.mjs .
COPY tailwind.config.ts .
COPY tsconfig.json .
COPY .gitignore .
COPY .eslintrc.json .

RUN npm i

RUN npm install

# Command to run when the container starts
CMD ["bash"]