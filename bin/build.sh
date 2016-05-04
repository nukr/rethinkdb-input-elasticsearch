#!/bin/bash

VERSION=$(ag "version\":" package.json | awk '{print $3}' | sed 's/[,"]//g')

docker build -t asia.gcr.io/instant-matter-785/input:${VERSION} .
