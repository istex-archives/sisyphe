FROM ubuntu:16.04

ENV NODE_VERSION=8
ENV NVM_DIR=/usr/local/nvm

COPY . /sisyphe
WORKDIR /sisyphe

RUN apt-get update -y \
    && apt-get install -y git curl cmake libpoppler-cpp-dev xmlstarlet \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.33.4/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION  \
    && nvm use default \
    && npm install -g mocha lerna \
    && npm install \
    && lerna bootstrap

RUN echo "/redis-3.2.5/src/redis-server /redis-3.2.5/redis.conf" >> ~/.bashrc

# RUN echo "git pull origin master && npm install && npm t" >>~/.bashrc
EXPOSE 6379