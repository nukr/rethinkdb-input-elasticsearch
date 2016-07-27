FROM mhart/alpine-node:6.2.2
MAINTAINER nukr <nukrs.w@gmail.com>

RUN apk add --no-cache curl

# http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/
COPY package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/

ENV DOCKERIZE_VERSION v0.2.0
RUN curl -L -q https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz -O \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

WORKDIR /opt/app
COPY . /opt/app

# Run app
CMD ["node", "/opt/app/dist/app.js"]
