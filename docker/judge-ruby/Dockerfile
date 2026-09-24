FROM ruby:3.4-bookworm

RUN useradd \
    --create-home \
    --uid 10001 \
    --shell /bin/bash \
    judge

USER judge

WORKDIR /workspace

CMD ["ruby", "--version"]