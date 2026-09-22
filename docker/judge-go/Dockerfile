FROM golang:1.26-bookworm

ENV GOPATH=/tmp/go-path \
    GOTMPDIR=/tmp

RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /bin/bash \
    judge

RUN mkdir -p /opt/go-warmup \
    && printf 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("warm")\n}\n' > /opt/go-warmup/main.go \
    && GOCACHE=/opt/go-cache go build -o /opt/go-warmup/main /opt/go-warmup/main.go \
    && chmod -R a+rX /opt/go-cache

USER judge

WORKDIR /workspace

CMD ["go", "version"]