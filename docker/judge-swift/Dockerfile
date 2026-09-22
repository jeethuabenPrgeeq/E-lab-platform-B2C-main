FROM swift:6.3

ENV CLANG_MODULE_CACHE_PATH=/tmp/swift-module-cache

RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /bin/bash \
    judge

USER judge

WORKDIR /workspace

CMD ["swift", "--version"]