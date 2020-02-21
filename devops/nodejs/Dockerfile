FROM osgeo/gdal:alpine-normal-latest

# Add nodejs
RUN apk add --no-cache --update \
      nodejs \
      npm \
      sqlite \
      curl

# Create app directory
# WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
