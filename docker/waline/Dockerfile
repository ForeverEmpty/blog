ARG WALINE_IMAGE=lizheming/waline:latest

FROM ${WALINE_IMAGE}

COPY patch-think-loader.cjs /tmp/patch-think-loader.cjs
RUN node /tmp/patch-think-loader.cjs && rm /tmp/patch-think-loader.cjs
