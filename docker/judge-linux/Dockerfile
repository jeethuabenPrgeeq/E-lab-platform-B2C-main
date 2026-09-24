FROM debian:bookworm-slim

RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /bin/bash \
    judge

USER judge

WORKDIR /workspace

CMD ["bash", "--version"]